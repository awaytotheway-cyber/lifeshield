/**
 * Maps a lab flag to a calm chip + everyday meaning.
 * Kept separate from Supabase so it can be unit-tested without React Native.
 */
import { COPY } from "@/lib/copy";
import type { StatusKind } from "@/lib/design-tokens";

export type ResultStatusTone = "within_range" | "worth_watching" | "needs_attention";

export type ResultStatusChip = {
  tone: ResultStatusTone;
  label: string;
};

/**
 * Maps the lab flag to a calm chip.
 * Never use the raw number as the headline.
 */
export function statusChipFromFlag(flag: string | null | undefined): ResultStatusChip {
  switch (flag) {
    case "normal":
      return { tone: "within_range", label: COPY.labChipWithinRange };
    case "low":
    case "high":
      return { tone: "worth_watching", label: COPY.labChipWorthWatching };
    case "critical":
    case "positive":
      return { tone: "needs_attention", label: COPY.labChipNeedsAttention };
    case "negative":
      // Negative on a report is usually “not found” — keep it calm.
      return { tone: "within_range", label: COPY.labChipNegative };
    default:
      return { tone: "within_range", label: COPY.labChipUnspecified };
  }
}

/**
 * The Moss clinical status a lab flag carries, or `null` when it carries none.
 *
 * `statusChipFromFlag` files an unflagged row under `within_range` so its
 * wording stays calm — "Saved — no flag yet" — and that is right for words
 * but wrong for colour: painting the row with the `withinRange` fill would
 * tell someone their result sits in the usual range when nobody has said so.
 * A flag the app does not recognise therefore maps to no clinical status at
 * all, and the row shows its word without a chip.
 *
 * The branches below are the twin of `statusChipFromFlag`'s: tone and colour
 * are decided from the same flag in the same order, so the two cannot drift
 * into saying different things about one result.
 */
export function mossStatusFromFlag(
  flag: string | null | undefined,
): StatusKind | null {
  switch (flag) {
    case "normal":
    // "Negative" on a report means not found on that test, which is
    // reassuring rather than borderline — the same reading that puts it in
    // the `within_range` tone above.
    case "negative":
      return "withinRange";
    case "low":
    case "high":
      return "worthWatching";
    case "critical":
    case "positive":
      return "worthDiscussing";
    default:
      return null;
  }
}

/**
 * Everyday paragraph for the detail screen. Information only — never a diagnosis.
 */
export function meaningForFlag(flag: string | null | undefined): string {
  switch (flag) {
    case "normal":
      return COPY.labMeaningNormal;
    case "low":
    case "high":
      return COPY.labMeaningWatching;
    case "critical":
      return COPY.labMeaningCritical;
    case "positive":
      return COPY.labMeaningPositive;
    case "negative":
      return COPY.labMeaningNegative;
    default:
      return COPY.labMeaningUnspecified;
  }
}
