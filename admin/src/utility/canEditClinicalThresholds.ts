/**
 * Owner and admin can change clinical cut-offs in the browser.
 * Clinicians can view thresholds only (matches Supabase RLS).
 */
export function canEditClinicalThresholds(
  role: string | null | undefined,
): boolean {
  return role === "owner" || role === "admin";
}
