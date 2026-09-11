/**
 * Supabase client for React Native / Expo.
 *
 * Session persistence (Day 2): SecureStore holds a tiny encryption key,
 * AsyncStorage holds the encrypted session. See lib/auth-storage.ts.
 *
 * Only public keys belong here: EXPO_PUBLIC_SUPABASE_URL and
 * EXPO_PUBLIC_SUPABASE_ANON_KEY. Never a service-role key.
 */
import "react-native-url-polyfill/auto";
import "react-native-get-random-values";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

import { createAuthStorage, isBrowser } from "@/lib/auth-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

function looksLikePlaceholder(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return (
    trimmed.length === 0 ||
    trimmed.includes("paste_your") ||
    trimmed.includes("your-project") ||
    trimmed === "undefined"
  );
}

/** True only when .env has a real-looking URL + anon key. */
export const isSupabaseConfigured =
  supabaseUrl.startsWith("https://") &&
  supabaseAnonKey.length > 20 &&
  !looksLikePlaceholder(supabaseUrl) &&
  !looksLikePlaceholder(supabaseAnonKey);

/**
 * Always export a client so imports never crash.
 * If keys are missing we still create a harmless placeholder client
 * and the UI shows a friendly "add your keys" message instead of a white screen.
 */
function createSupabaseClient(): SupabaseClient {
  const url = isSupabaseConfigured ? supabaseUrl : "https://example.supabase.co";
  const key = isSupabaseConfigured
    ? supabaseAnonKey
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjAsImV4cCI6MH0.placeholder";

  // Web: implicit + localStorage (see auth-storage). PKCE + encrypted
  // AsyncStorage on Expo web often swallows the session after sign-up.
  // Native: PKCE, and ignore URL fragments (there is no browser bar).
  const isWeb = Platform.OS === "web";

  return createClient(url, key, {
    auth: {
      storage: createAuthStorage(),
      autoRefreshToken: isBrowser,
      persistSession: isBrowser,
      detectSessionInUrl: isWeb,
      flowType: isWeb ? "implicit" : "pkce",
    },
  });
}

export const supabase = createSupabaseClient();

if (isBrowser) {
  try {
    AppState.addEventListener("change", (state) => {
      try {
        if (state === "active") {
          void supabase.auth.startAutoRefresh();
        } else {
          void supabase.auth.stopAutoRefresh();
        }
      } catch {
        // Stay alive — a missed refresh is better than a crash.
      }
    });
  } catch {
    // AppState is unavailable in some test/web edge cases.
  }
}
