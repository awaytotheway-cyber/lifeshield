/**
 * Who may approve / finalise patient plans in the Review Queue.
 *
 * Owner and admin can always sign off.
 * Clinicians need can_sign_off = true on their doctors row.
 */
import type { StaffRole } from "./supabaseClient";
import { supabaseClient } from "./supabaseClient";

export function canSignOffByRole(role: StaffRole | string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

/** True when this signed-in user may press Approve / Finalise in the admin UI. */
export async function canSignOffPlan(
  role: StaffRole | string | null | undefined,
  userId: string | undefined,
): Promise<boolean> {
  if (canSignOffByRole(role)) {
    return true;
  }

  if (role !== "clinician" || !userId) {
    return false;
  }

  try {
    const { data, error } = await supabaseClient
      .from("doctors")
      .select("can_sign_off, active")
      .eq("auth_user_id", userId)
      .eq("active", true)
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    return Boolean(data.can_sign_off);
  } catch {
    return false;
  }
}
