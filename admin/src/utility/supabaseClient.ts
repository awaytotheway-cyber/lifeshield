/**
 * Supabase client for the browser admin app.
 *
 * Uses the public anon key only (same as the mobile app).
 * Row Level Security decides what each signed-in staff member can see.
 * Never put a service-role key here.
 */
import { createClient } from "@refinedev/supabase";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

function looksLikePlaceholder(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return (
    trimmed.length === 0 ||
    trimmed.includes("paste_your") ||
    trimmed.includes("your-project") ||
    trimmed === "undefined"
  );
}

/** True when .env has real-looking Supabase keys. */
export const isSupabaseConfigured =
  supabaseUrl.startsWith("https://") &&
  supabaseAnonKey.length > 20 &&
  !looksLikePlaceholder(supabaseUrl) &&
  !looksLikePlaceholder(supabaseAnonKey);

export const supabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : "https://example.supabase.co",
  isSupabaseConfigured
    ? supabaseAnonKey
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder",
  {
    db: { schema: "public" },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);

export type StaffRole = "owner" | "admin" | "clinician" | "clinic_staff";

/** Returns the staff_roles row for the signed-in user, or null if none. */
export async function getStaffRoleForUser(
  userId: string,
): Promise<{ role: StaffRole } | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  try {
    const { data, error } = await supabaseClient
      .from("staff_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data?.role) {
      return null;
    }

    return { role: data.role as StaffRole };
  } catch {
    return null;
  }
}
