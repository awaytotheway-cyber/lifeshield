import { isSupabaseConfigured } from "./supabaseClient";

const CONNECTION_HELP =
  "Can't reach Supabase — check admin/.env has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (same values as the mobile app), then restart npm run dev.";

function friendlyError(message: string, title = "Sign-in problem"): Error {
  const err = new Error(message);
  err.name = title;
  return err;
}

function isNetworkFetchFailure(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const { name, message } = error;
  const lower = message.toLowerCase();

  return (
    name === "AuthRetryableFetchError" ||
    message === "Failed to fetch" ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("load failed")
  );
}

/** Turn raw Supabase / fetch errors into plain-English messages for staff. */
export function formatAuthError(error: unknown): Error {
  if (!isSupabaseConfigured) {
    return friendlyError(CONNECTION_HELP, "Supabase not configured");
  }

  if (isNetworkFetchFailure(error)) {
    return friendlyError(
      `${CONNECTION_HELP} Also confirm your Supabase project is active (not paused) at supabase.com.`,
      "Can't reach Supabase",
    );
  }

  if (error instanceof Error) {
    if (error.message.includes("Invalid login credentials")) {
      return friendlyError(
        "Wrong email or password. Use the same credentials as the mobile app.",
        "Invalid credentials",
      );
    }

    return error;
  }

  return friendlyError("Sign-in failed. Please try again.");
}
