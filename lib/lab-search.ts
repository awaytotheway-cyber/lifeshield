/**
 * Pure lab search + proximity ranking (Phase D).
 *
 * No PostGIS: proximity uses country + postcode prefix. Ranking tiers:
 *   1. Country matches, exact postcode match
 *   2. Country matches, postcode prefix match (4 chars, then 3)
 *   3. Country matches, no postcode data (mail-in / country-wide labs)
 *   4. No country data on the lab (global / TBD)
 * Country mismatch drops the lab entirely — sending a US user to an
 * Indian lab is the classic "helpful default" failure.
 *
 * When the user has no location set, labs are returned in their input order
 * (usually created_at from the DB) so the screen still shows something.
 */

export type LabRow = {
  id: string;
  provider_code: string;
  name: string;
  address: Record<string, unknown>;
  postcode: string | null;
  country: string | null;
  price: number | null;
  currency: string;
  availability: Record<string, unknown>;
  contact: Record<string, unknown>;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type UserLocation = {
  postcode: string | null;
  country: string | null;
};

export type RankedLab = {
  lab: LabRow;
  /**
   * Higher = closer.
   *   4 exact postcode + country
   *   3 4-char prefix + country
   *   2 3-char prefix + country
   *   1 country only
   *   0 no country data on the lab; shown last
   */
  score: number;
  match_reason:
    | "exact_postcode"
    | "postcode_prefix"
    | "country_only"
    | "global";
};

/**
 * Normalise a postcode for comparison: uppercase and strip whitespace.
 * UK "SW1A 1AA" and "sw1a1aa" both become "SW1A1AA".
 */
export function normalisePostcode(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.toUpperCase().replace(/\s+/g, "");
}

function normaliseCountry(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.toUpperCase().trim();
}

/**
 * Filter and rank labs by proximity to the user's location. Inactive labs
 * are dropped upfront. Ties within a tier are broken by name for a stable
 * UI ordering.
 */
export function rankLabsForUser(
  labs: readonly LabRow[],
  location: UserLocation,
): RankedLab[] {
  const active = labs.filter((lab) => lab.active);

  const userCountry = normaliseCountry(location.country);
  const userPostcode = normalisePostcode(location.postcode);

  const ranked: RankedLab[] = [];
  for (const lab of active) {
    const labCountry = normaliseCountry(lab.country);
    // Country mismatch drops the lab entirely — but only when both sides are
    // known. A lab with no country (mail-in / TBD) stays; a user with no
    // country is treated as global and sees everything.
    if (userCountry && labCountry && userCountry !== labCountry) {
      continue;
    }

    let score = 0;
    let match_reason: RankedLab["match_reason"] = "global";

    if (!labCountry) {
      score = 0;
      match_reason = "global";
    } else if (!userCountry) {
      // We know the lab's country but not the user's — treat as country-only.
      score = 1;
      match_reason = "country_only";
    } else if (userCountry === labCountry) {
      const labPostcode = normalisePostcode(lab.postcode);
      if (userPostcode && labPostcode && userPostcode === labPostcode) {
        score = 4;
        match_reason = "exact_postcode";
      } else if (
        userPostcode &&
        labPostcode &&
        userPostcode.length >= 4 &&
        labPostcode.length >= 4 &&
        userPostcode.slice(0, 4) === labPostcode.slice(0, 4)
      ) {
        score = 3;
        match_reason = "postcode_prefix";
      } else if (
        userPostcode &&
        labPostcode &&
        userPostcode.length >= 3 &&
        labPostcode.length >= 3 &&
        userPostcode.slice(0, 3) === labPostcode.slice(0, 3)
      ) {
        score = 2;
        match_reason = "postcode_prefix";
      } else {
        score = 1;
        match_reason = "country_only";
      }
    }
    ranked.push({ lab, score, match_reason });
  }

  ranked.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return a.lab.name.localeCompare(b.lab.name);
  });
  return ranked;
}

/**
 * True when the user's location is complete enough to filter meaningfully.
 * The screen uses this to prompt for postcode / country if it's missing —
 * without it, ranking degrades to "everything, sorted by name".
 */
export function locationIsSet(location: UserLocation): boolean {
  return normaliseCountry(location.country).length === 2;
}

/**
 * Human label for a match reason. Kept out of the UI so tests can assert
 * on it and copy stays consistent between the list and detail screens.
 */
export function matchReasonLabel(reason: RankedLab["match_reason"]): string {
  switch (reason) {
    case "exact_postcode":
      return "in your postcode";
    case "postcode_prefix":
      return "near your postcode";
    case "country_only":
      return "in your country";
    case "global":
      return "mail-in / country-wide";
    default:
      return "";
  }
}
