import { Chip, type ChipTone } from "@/components/ui/Chip";

import type { ResultStatusChip, ResultStatusTone } from "@/lib/result-status";

/** Green for calm, amber for worth watching, red only for genuine attention. */
const TONE_FOR_STATUS: Record<ResultStatusTone, ChipTone> = {
  within_range: "green",
  worth_watching: "amber",
  needs_attention: "red",
};

/**
 * Colour-coded status. Leads the row so the raw number is never the headline.
 *
 * Thin wrapper over the kit's Chip so status colours stay in one place.
 */
export function StatusChip({ chip }: { chip: ResultStatusChip }) {
  return <Chip label={chip.label} tone={TONE_FOR_STATUS[chip.tone]} />;
}
