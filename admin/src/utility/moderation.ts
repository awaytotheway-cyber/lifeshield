/**
 * Pure helpers for the moderation screens (reports and blocks). No React and
 * no Supabase import, so they can be tested with tsx.
 */

export type ReportStatus = "open" | "reviewing" | "actioned" | "dismissed";

export const REPORT_STATUSES: readonly ReportStatus[] = [
  "open",
  "reviewing",
  "actioned",
  "dismissed",
];

export function isReportStatus(value: unknown): value is ReportStatus {
  return REPORT_STATUSES.includes(value as ReportStatus);
}

/** Chip colour for a report: open needs attention, the rest are settled or in hand. */
export function reportChipKind(
  status: string,
): "warning" | "info" | "success" | "inactive" {
  switch (status) {
    case "open":
      return "warning";
    case "reviewing":
      return "info";
    case "actioned":
      return "success";
    default:
      return "inactive";
  }
}

export function reportStatusLabel(status: string): string {
  switch (status) {
    case "open":
      return "Open";
    case "reviewing":
      return "Reviewing";
    case "actioned":
      return "Action taken";
    case "dismissed":
      return "Dismissed";
    default:
      return status;
  }
}

/** Open reports first, then the rest, newest first within each group. */
export function sortReportsForQueue<
  T extends { status: string; created_at: string },
>(reports: readonly T[]): T[] {
  const rank = (status: string) => (status === "open" ? 0 : status === "reviewing" ? 1 : 2);
  return [...reports].sort(
    (a, b) =>
      rank(a.status) - rank(b.status) ||
      (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0),
  );
}

/** People blocked by the most members, busiest first. Ties break on id. */
export function mostBlocked(
  blocks: readonly { blocked_id: string }[],
  top = 10,
): { id: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const block of blocks) {
    counts.set(block.blocked_id, (counts.get(block.blocked_id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
    .slice(0, top);
}

/** Other reports about the same target, not counting the one being read. */
export function otherReportsAbout(
  reports: readonly { id: string; target_id: string }[],
  targetId: string,
  exceptId: string,
): number {
  return reports.filter((r) => r.target_id === targetId && r.id !== exceptId)
    .length;
}

export type PersonRow = {
  buddy_display_name?: string | null;
  full_name?: string | null;
  city?: string | null;
};

/**
 * A short label for a person. Members only ever show each other a first name
 * and a city, so that is all a moderator needs to recognise them; an unknown
 * or deleted account falls back to the start of its id.
 */
export function personLabel(person: PersonRow | undefined, id: string): string {
  const name =
    person?.buddy_display_name?.trim() ||
    person?.full_name?.trim().split(/\s+/)[0] ||
    "";
  const city = person?.city?.trim() ?? "";
  if (!name && !city) {
    return `Member ${id.slice(0, 8)}`;
  }
  return [name || `Member ${id.slice(0, 8)}`, city].filter(Boolean).join(" · ");
}
