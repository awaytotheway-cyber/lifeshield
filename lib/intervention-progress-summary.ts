/**
 * Pure summary helpers for intervention progress. Kept in its own file (no
 * Supabase / RN imports) so lib/intervention-progress.test.ts can import
 * them without dragging the app frame into tsx.
 */

export type InterventionProgressValue = {
  done?: boolean;
  adherence?: number;
  amount?: number;
  unit?: string;
};

export type InterventionProgressEntry = {
  id: string;
  intervention_id: string;
  user_id: string;
  recorded_at: string;
  value: InterventionProgressValue;
  note: string | null;
};

/**
 * "Days with at least one 'done' entry in the last 7 days." Called by the
 * plan detail screen for a summary chip.
 */
export function countDoneInLast7Days(
  rows: readonly InterventionProgressEntry[],
  now: Date = new Date(),
): number {
  const cutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const days = new Set<string>();
  for (const row of rows) {
    if (!row.value?.done) continue;
    const t = new Date(row.recorded_at).getTime();
    if (Number.isNaN(t) || t < cutoff) continue;
    const d = new Date(t);
    days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }
  return days.size;
}
