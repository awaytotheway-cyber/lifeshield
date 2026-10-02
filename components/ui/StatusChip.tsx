import { Chip, type ChipTone } from "@/components/ui/Chip";

export type StatusChipKind =
  | "normal"
  | "attention"
  | "critical"
  | "approved"
  | "draft";

type StatusChipProps = {
  kind: StatusChipKind;
  label: string;
};

const TONE_FOR_KIND: Record<StatusChipKind, ChipTone> = {
  normal: "green",
  attention: "amber",
  critical: "red",
  approved: "orange",
  draft: "neutral",
};

/**
 * Small status pill. Use a calm phrase — never a raw number as the headline.
 * Red only for genuine high-risk (critical).
 *
 * Thin wrapper over the kit's Chip so status colours stay in one place.
 */
export function StatusChip({ kind, label }: StatusChipProps) {
  return <Chip label={label} tone={TONE_FOR_KIND[kind]} />;
}
