/**
 * Who may start the screening pathway.
 *
 * The protocol excludes women under 18 and sets no floor for men, so the age
 * rule depends on sex. Anything that is not exactly "male" takes the floor:
 * the safe reading for "other" is the one that does not let a minor in.
 * Whether the floor should also apply to men is a clinical and legal call
 * (a minor cannot give the consents either); it is a one-line change here.
 *
 * Pure on purpose: `now` is injectable so the birthday boundaries are testable,
 * and nothing here imports React Native or Supabase.
 */

export const MINIMUM_AGE = 18;

export type Eligibility =
  | { status: "eligible" }
  | { status: "under_age" }
  | { status: "needs_details" };

const OLDEST_PLAUSIBLE_AGE = 130;

/**
 * Whole years completed on `now`, from a YYYY-MM-DD string. Null for anything
 * that is not a real past calendar date. A 29 February birthday completes its
 * year on 1 March in a non-leap year.
 */
export function ageOn(isoDate: string, now: Date = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return null;
  }
  const [year, month, day] = isoDate.split("-").map(Number);
  const dob = new Date(year, month - 1, day);
  if (
    dob.getFullYear() !== year ||
    dob.getMonth() !== month - 1 ||
    dob.getDate() !== day
  ) {
    return null;
  }
  let age = now.getFullYear() - year;
  const monthDiff = now.getMonth() - (month - 1);
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < day)) {
    age -= 1;
  }
  return age >= 0 && age < OLDEST_PLAUSIBLE_AGE ? age : null;
}

export function eligibilityFor(
  details: { sex: string | null | undefined; dateOfBirth: string | null | undefined },
  now: Date = new Date(),
): Eligibility {
  const sex = (details.sex ?? "").trim().toLowerCase();
  if (sex !== "male" && sex !== "female" && sex !== "other") {
    return { status: "needs_details" };
  }
  const age = ageOn(details.dateOfBirth ?? "", now);
  if (age === null) {
    return { status: "needs_details" };
  }
  if (sex !== "male" && age < MINIMUM_AGE) {
    return { status: "under_age" };
  }
  return { status: "eligible" };
}
