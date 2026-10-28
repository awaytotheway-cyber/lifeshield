/**
 * Calendar-date helpers on YYYY-MM-DD strings, in local time. Kept out of
 * lib/follow-ups.ts so the scheduling rules can be tested without Supabase.
 */
export function todayIsoDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map((part) => Number(part));
  if (!year || !month || !day) {
    return isoDate;
  }
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return todayIsoDate(date);
}
