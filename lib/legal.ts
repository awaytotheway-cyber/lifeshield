/**
 * Where the full Privacy Policy / Terms HTML lives.
 *
 * In development, Metro serves public/prescope-privacy.html on the same
 * host as Expo (localhost or your computer's Wi-Fi address).
 * For a store build, set EXPO_PUBLIC_PRIVACY_POLICY_URL to the hosted page.
 */
import Constants from "expo-constants";
import { Platform } from "react-native";

export type LegalSection = "privacy" | "terms";

function hostedLegalUrl(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim();
  if (!fromEnv) {
    return null;
  }
  return fromEnv.replace(/\/$/, "");
}

function metroOrigin(): string | null {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  const hostUri = Constants.expoConfig?.hostUri?.trim();
  if (hostUri) {
    return hostUri.startsWith("http") ? hostUri : `http://${hostUri}`;
  }

  return null;
}

export function legalPageUrl(section: LegalSection = "privacy"): string {
  const hosted = hostedLegalUrl();
  const origin = hosted ?? metroOrigin() ?? "http://localhost:8081";
  const page = hosted ?? `${origin}/prescope-privacy.html`;
  const hash = section === "terms" ? "#terms" : "#overview";
  return `${page}${hash}`;
}
