/**
 * Maps a lab flag to a calm chip + everyday meaning.
 * Kept separate from Supabase so it can be unit-tested without React Native.
 */
import { COPY } from "@/lib/copy";

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
