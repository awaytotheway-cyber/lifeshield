import { Alert } from "antd";

import { isSupabaseConfigured } from "../utility/supabaseClient";

/**
 * Shown at the top of the admin shell when .env keys are missing.
 */
export function ConfigWarning() {
  if (isSupabaseConfigured) {
    return null;
  }

  return (
    <Alert
      type="error"
      showIcon
      banner
      message="Supabase is not configured"
      description="Copy admin/.env.example to admin/.env and paste your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (same values as the mobile app)."
      style={{ marginBottom: 16 }}
    />
  );
}
