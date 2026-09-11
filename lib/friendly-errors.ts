/**
 * Turns technical errors into short sentences a non-coder can understand.
 * Never put API keys or tokens into these messages.
 */

import { COPY } from "@/lib/copy";

export type ErrorKind =
  | "keys"
  | "tables"
  | "rls"
  | "profile"
  | "network"
  | "auth"
  | "trigger"
  | "unknown";

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readCode(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "";
  }
  const record = error as { code?: unknown; error_code?: unknown };
  const code = readString(record.code) || readString(record.error_code);
  return code.toLowerCase();
}

/** Pulls message + code + hint from a Supabase / fetch error, without secrets. */
export function rawErrorText(error: unknown): string {
  if (error instanceof Error) {
    const extra = [
      readString((error as { code?: unknown }).code),
      readString((error as { details?: unknown }).details),
      readString((error as { hint?: unknown }).hint),
      readString((error as { error_description?: unknown }).error_description),
    ]
      .filter((part) => part.length > 0)
      .join(" ");
    return `${error.message} ${extra}`.trim();
  }
  if (error && typeof error === "object") {
    const record = error as {
      message?: unknown;
      msg?: unknown;
      code?: unknown;
      error_code?: unknown;
      details?: unknown;
      hint?: unknown;
      error_description?: unknown;
      error?: unknown;
    };
    return [
      readString(record.message),
      readString(record.msg),
      readString(record.error_description),
      typeof record.error === "string" ? record.error : "",
      readString(record.code),
      readString(record.error_code),
      readString(record.details),
      readString(record.hint),
    ]
      .filter((part) => part.length > 0)
      .join(" ");
  }
  if (typeof error === "string") {
    return error;
  }
  return "";
}

function looksLikeSecret(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("eyj") ||
    lower.includes("service_role") ||
    lower.includes("bearer ")
  );
}

/** Short, secret-free snippet so the real reason is not swallowed. */
export function safeErrorSnippet(error: unknown, maxLength = 160): string {
  const raw = rawErrorText(error).replace(/\s+/g, " ").trim();
  if (!raw || looksLikeSecret(raw)) {
    return "";
  }
  if (raw.length <= maxLength) {
    return raw;
  }
  return `${raw.slice(0, maxLength - 1)}…`;
}

export function classifyError(error: unknown): { kind: ErrorKind; message: string } {
  const text = rawErrorText(error).toLowerCase();
  const code = readCode(error);

  if (!text && !code) {
    return {
      kind: "unknown",
      message:
        "Something went wrong, but the app could not read the error. Try again.",
    };
  }

  if (
    code === "email_exists" ||
    code === "user_already_exists" ||
    code === "identity_already_exists" ||
    text.includes("already registered") ||
    text.includes("already been registered") ||
    text.includes("email address has already") ||
    text.includes("user already exists")
  ) {
    return { kind: "auth", message: COPY.registerEmailExists };
  }

  if (
    code === "email_not_confirmed" ||
    text.includes("email not confirmed") ||
    text.includes("email_not_confirmed")
  ) {
    return {
      kind: "auth",
      message:
        "Please confirm your email, or turn off “Confirm email” in Supabase for local testing (Authentication → Providers → Email).",
    };
  }

  if (
    code === "weak_password" ||
    text.includes("weak_password") ||
    text.includes("password should") ||
    (text.includes("password") &&
      (text.includes("at least 8") ||
        text.includes("too short") ||
        text.includes("least one")))
  ) {
    return { kind: "auth", message: COPY.registerPasswordPolicy };
  }

  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    text.includes("rate limit") ||
    text.includes("over_email_send_rate_limit") ||
    text.includes("for security purposes") ||
    text.includes("only request this after")
  ) {
    return { kind: "auth", message: COPY.registerRateLimit };
  }

  if (
    text.includes("redirect") ||
    text.includes("redirect_to") ||
    text.includes("not allowed on this server") ||
    text.includes("invalid redirect")
  ) {
    return { kind: "auth", message: COPY.registerRedirectUrl };
  }

  if (
    code === "signup_disabled" ||
    code === "email_provider_disabled" ||
    text.includes("signups not allowed") ||
    text.includes("signup is disabled") ||
    text.includes("email signups are disabled")
  ) {
    return {
      kind: "auth",
      message:
        "Email sign-up is turned off in Supabase. Open Authentication → Providers → Email and turn Enable Email provider / Allow new users on.",
    };
  }

  if (
    text.includes("invalid api key") ||
    text.includes("invalid jwt") ||
    text.includes("jwt expired") ||
    text.includes("malformed jwt") ||
    code === "bad_jwt" ||
    text.includes("bad_jwt") ||
    (text.includes("unauthorized") && text.includes("apikey"))
  ) {
    return {
      kind: "keys",
      message:
        "The app cannot talk to Supabase because the keys look wrong. In .env, paste Project URL and the anon public key from Settings → API, then restart with npx expo start --clear. Never use the service-role key.",
    };
  }

  if (
    text.includes("failed to fetch") ||
    text.includes("network request failed") ||
    text.includes("network error") ||
    text.includes("load failed") ||
    text.includes("request_timeout") ||
    text.includes("authretryablefetcherror") ||
    (text.includes("network") && text.includes("fetch"))
  ) {
    return {
      kind: "network",
      message:
        "We couldn’t reach Supabase (network or missing keys). Check Wi‑Fi. If you installed an APK, confirm EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY were set as EAS secrets before building. On your computer, restart with npx expo start --clear after editing .env.",
    };
  }

  if (
    code === "unexpected_failure" ||
    text.includes("database error saving new user") ||
    text.includes("error creating user") ||
    text.includes("unexpected_failure")
  ) {
    return {
      kind: "trigger",
      message:
        "Sign-up reached Supabase, but creating the matching profile row failed. In Supabase → SQL Editor, paste supabase/schema.sql and click Run (safe to re-run). Then try creating the account again.",
    };
  }

  if (
    text.includes("does not exist") ||
    text.includes("schema cache") ||
    text.includes("could not find the table") ||
    (text.includes("relation") && text.includes("does not exist")) ||
    text.includes("pgrst205") ||
    text.includes("pgrst204")
  ) {
    return {
      kind: "tables",
      message:
        "The database tables are missing or out of date. In Supabase, open SQL Editor, paste the contents of supabase/schema.sql, and click Run.",
    };
  }

  if (
    text.includes("row-level security") ||
    text.includes("42501") ||
    text.includes("permission denied") ||
    text.includes("violates row-level") ||
    // Whole-word-ish: avoid matching unrelated words that merely contain "rls".
    text.includes("rls policy") ||
    text.includes("row level security")
  ) {
    return {
      kind: "rls",
      message:
        "Supabase blocked this save (privacy rules). Re-run supabase/schema.sql in the SQL Editor so the table policies exist, and confirm you are logged in as the same account.",
    };
  }

  if (
    text.includes("foreign key") ||
    text.includes("23503") ||
    text.includes('key is not present in table "profiles"') ||
    text.includes("key is not present in table “profiles”")
  ) {
    return {
      kind: "profile",
      message:
        "Your login exists, but the profile row is missing. The app will try to create it. If this keeps happening, re-run supabase/schema.sql so the signup trigger exists.",
    };
  }

  if (
    text.includes("invalid login") ||
    text.includes("invalid credentials") ||
    code === "invalid_credentials"
  ) {
    return {
      kind: "auth",
      message:
        "That email or password doesn’t match. Try again, or create an account.",
    };
  }

  const snippet = safeErrorSnippet(error);
  return {
    kind: "unknown",
    message: snippet
      ? `Couldn’t finish this step: ${snippet}`
      : "Something went wrong. Please try again.",
  };
}

export function friendlyAuthMessage(raw: string): string {
  return classifyError({ message: raw }).message;
}

/**
 * Prefer a known classification. If we do not recognise the error,
 * use the screen's fallback (e.g. "couldn't save this section") instead of
 * blaming keys/SQL for every unknown glitch.
 */
export function messageFromUnknown(error: unknown, fallback: string): string {
  const classified = classifyError(error);
  if (classified.kind === "unknown") {
    const snippet = safeErrorSnippet(error);
    if (snippet) {
      return `${fallback} (${snippet})`;
    }
    return fallback;
  }
  return classified.message;
}

/** Extra hint only on the create-account screen. */
export function registerFailureMessage(error: unknown): string {
  const classified = classifyError(error);
  if (classified.kind === "auth" && classified.message === COPY.registerEmailExists) {
    return classified.message;
  }
  if (
    classified.kind === "unknown" &&
    !classified.message.toLowerCase().includes("log in")
  ) {
    return `${classified.message} If this email already has an account, tap Log in instead.`;
  }
  return classified.message;
}
