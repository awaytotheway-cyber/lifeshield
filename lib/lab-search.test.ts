/**
 *   npx --yes tsx --tsconfig tsconfig.json lib/lab-search.test.ts
 */
import assert from "node:assert/strict";
import {
  locationIsSet,
  matchReasonLabel,
  normalisePostcode,
  rankLabsForUser,
  type LabRow,
} from "./lab-search";

function lab(
  overrides: Partial<LabRow> & { name: string; id?: string },
): LabRow {
  return {
    id: overrides.id ?? `l-${overrides.name}`,
    provider_code: overrides.provider_code ?? "manual",
    name: overrides.name,
    address: overrides.address ?? {},
    postcode: overrides.postcode ?? null,
    country: overrides.country ?? null,
    price: overrides.price ?? null,
    currency: overrides.currency ?? "INR",
    availability: overrides.availability ?? {},
    contact: overrides.contact ?? {},
    active: overrides.active ?? true,
    created_at: overrides.created_at ?? "2026-01-01T00:00:00Z",
    updated_at: overrides.updated_at ?? "2026-01-01T00:00:00Z",
  };
}

// ---------- normalisePostcode ----------
assert.equal(normalisePostcode("SW1A 1AA"), "SW1A1AA");
assert.equal(normalisePostcode("sw1a1aa"), "SW1A1AA");
assert.equal(normalisePostcode("  400001 "), "400001");
assert.equal(normalisePostcode(null), "");
assert.equal(normalisePostcode(undefined), "");
assert.equal(normalisePostcode(""), "");

// ---------- locationIsSet ----------
assert.equal(locationIsSet({ country: "IN", postcode: null }), true);
assert.equal(locationIsSet({ country: "in", postcode: null }), true); // normalised
assert.equal(locationIsSet({ country: null, postcode: "SW1A1AA" }), false);
assert.equal(locationIsSet({ country: "", postcode: null }), false);
assert.equal(locationIsSet({ country: "USA", postcode: null }), false); // 3 chars fails

// ---------- rankLabsForUser ----------

const labs: LabRow[] = [
  lab({ name: "London Postcode", country: "GB", postcode: "SW1A 1AA" }),
  lab({ name: "London 4-Prefix", country: "GB", postcode: "SW1A 2ZZ" }),
  lab({ name: "London 3-Prefix", country: "GB", postcode: "SW2X 9ZZ" }),
  lab({ name: "GB Country-only", country: "GB", postcode: null }),
  lab({ name: "US Lab", country: "US", postcode: "10001" }),
  lab({ name: "Global Mail-in", country: null, postcode: null }),
  lab({ name: "Inactive", country: "GB", postcode: "SW1A1AA", active: false }),
];

// User in GB SW1A 1AA — exact postcode wins.
{
  const ranked = rankLabsForUser(labs, {
    country: "GB",
    postcode: "SW1A 1AA",
  });
  assert.equal(ranked[0].lab.name, "London Postcode");
  assert.equal(ranked[0].match_reason, "exact_postcode");
  assert.equal(ranked[0].score, 4);
  // 4-char prefix (SW1A ≠ SW1A? actually SW1A === SW1A after 4 chars, and
  // this row's postcode "SW1A 2ZZ" normalises to "SW1A2ZZ" — first 4 chars
  // "SW1A" match the user's "SW1A").
  assert.equal(ranked[1].lab.name, "London 4-Prefix");
  assert.equal(ranked[1].score, 3);
  // 3-char prefix "SW2" vs user's "SW1" fails at 3 chars too — so this
  // row actually falls through to country-only. That's real behaviour, not
  // a bug: our postcode heuristic doesn't understand UK district layout.
  const threePrefix = ranked.find((r) => r.lab.name === "London 3-Prefix");
  assert.equal(threePrefix?.score, 1);
  assert.equal(threePrefix?.match_reason, "country_only");
  // Country-only.
  const countryOnly = ranked.find((r) => r.lab.name === "GB Country-only");
  assert.equal(countryOnly?.score, 1);
  // Global mail-in last.
  assert.equal(ranked[ranked.length - 1].lab.name, "Global Mail-in");
  assert.equal(ranked[ranked.length - 1].score, 0);
  // US Lab dropped (country mismatch).
  assert.equal(ranked.some((r) => r.lab.name === "US Lab"), false);
  // Inactive lab never shown.
  assert.equal(ranked.some((r) => r.lab.name === "Inactive"), false);
}

// 4-char prefix hit: user in IN 400001, lab in IN 400012 shares "4000" prefix.
{
  const rows = [
    lab({ name: "Very Near", country: "IN", postcode: "400012" }),
    lab({ name: "Far", country: "IN", postcode: "500001" }),
  ];
  const ranked = rankLabsForUser(rows, {
    country: "IN",
    postcode: "400001",
  });
  const near = ranked.find((r) => r.lab.name === "Very Near");
  const far = ranked.find((r) => r.lab.name === "Far");
  assert.equal(near?.score, 3);
  assert.equal(near?.match_reason, "postcode_prefix");
  assert.equal(far?.score, 1);
  assert.equal(far?.match_reason, "country_only");
}

// 3-char-only prefix hit: user "400001" vs lab "400999" shares only "400".
{
  const rows = [
    lab({ name: "Same District", country: "IN", postcode: "400999" }),
  ];
  const ranked = rankLabsForUser(rows, {
    country: "IN",
    postcode: "400001",
  });
  assert.equal(ranked[0].score, 2);
  assert.equal(ranked[0].match_reason, "postcode_prefix");
}

// User in US 10001 — sees US labs + global; GB labs dropped.
{
  const ranked = rankLabsForUser(labs, { country: "US", postcode: "10001" });
  assert.equal(ranked[0].lab.name, "US Lab");
  assert.equal(ranked[0].match_reason, "exact_postcode");
  // GB rows dropped.
  assert.equal(ranked.some((r) => (r.lab.country ?? "") === "GB"), false);
  // Global mail-in still there.
  assert.equal(ranked.some((r) => r.lab.name === "Global Mail-in"), true);
}

// User with no location — everything ranked as country_only (for labs with a
// country) or global. Sort is by score then name — the global row sits last.
{
  const ranked = rankLabsForUser(labs, { country: null, postcode: null });
  // Inactive still dropped.
  assert.equal(ranked.some((r) => r.lab.name === "Inactive"), false);
  // Global mail-in should be last (score 0).
  assert.equal(ranked[ranked.length - 1].lab.name, "Global Mail-in");
  // Everyone else is country_only.
  for (const entry of ranked.slice(0, -1)) {
    assert.equal(entry.match_reason, "country_only");
  }
}

// User country matches lab country but postcode data is missing on one side
// — falls through to country_only, not to "exact" or "prefix".
{
  const ranked = rankLabsForUser(labs, { country: "GB", postcode: null });
  const country = ranked.find((r) => r.lab.name === "GB Country-only");
  assert.equal(country?.match_reason, "country_only");
  const withPost = ranked.find((r) => r.lab.name === "London Postcode");
  assert.equal(withPost?.match_reason, "country_only");
}

// Tie break by name within a tier: two GB country-only labs sort by name.
{
  const rows = [
    lab({ name: "Zulu", country: "GB", postcode: null }),
    lab({ name: "Alpha", country: "GB", postcode: null }),
  ];
  const ranked = rankLabsForUser(rows, { country: "GB", postcode: null });
  assert.equal(ranked[0].lab.name, "Alpha");
  assert.equal(ranked[1].lab.name, "Zulu");
}

// ---------- matchReasonLabel ----------
assert.equal(matchReasonLabel("exact_postcode"), "in your postcode");
assert.equal(matchReasonLabel("postcode_prefix"), "near your postcode");
assert.equal(matchReasonLabel("country_only"), "in your country");
assert.equal(matchReasonLabel("global"), "mail-in / country-wide");

// eslint-disable-next-line no-console
console.log("lab-search.test.ts OK");
