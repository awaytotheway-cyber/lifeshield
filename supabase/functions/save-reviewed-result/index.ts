// THIS IS AN EDGE FUNCTION (TypeScript), not SQL.
// Do not paste this file into the SQL Editor.
// Deploy: supabase functions deploy save-reviewed-result
//
// The service-role key lives in Deno.env only. Never put it in the mobile app.

import { createClient } from "jsr:@supabase/supabase-js@2";

import { sendPushForUser } from "./send-push-core.ts";

const DEFAULT_ADMIN_EMAILS = ["awaytotheway@gmail.com"];

const ALLOWED_FLAGS = [
  "normal",
  "low",
  "high",
  "critical",
  "positive",
  "negative",
] as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isLocalDevOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

// Expo web (localhost:8081) sends a preflight OPTIONS request first.
// Echo that origin so the browser does not block the real POST.
function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": isLocalDevOrigin(origin) ? origin : "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-api-version, prefer",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
}

function jsonResponse(
  req: Request,
  body: unknown,
  status: number,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(req),
  });
}

function adminEmails(): string[] {
  const fromSecret = Deno.env.get("ADMIN_EMAILS");
  if (fromSecret && fromSecret.trim().length > 0) {
    return fromSecret
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0);
  }
  return DEFAULT_ADMIN_EMAILS.map((email) => email.toLowerCase());
}

function isAdminEmail(email: string | undefined): boolean {
  if (!email) {
    return false;
  }
  return adminEmails().includes(email.trim().toLowerCase());
}

function readBearerToken(req: Request): string | null {
  const header = req.headers.get("Authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readOptionalText(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function readRequiredText(value: unknown): string | null {
  return readOptionalText(value);
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(req) });
    }

    if (req.method !== "POST") {
      return jsonResponse(req, { error: "Use POST" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse(
        req,
        { error: "Server is missing Supabase secrets. Ask your developer to set them." },
        500,
      );
    }

    const jwt = readBearerToken(req);
    if (!jwt) {
      return jsonResponse(req, { error: "Please sign in first." }, 401);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(jwt);
    if (userError || !userData.user) {
      return jsonResponse(req, { error: "Your session is not valid. Please sign in again." }, 401);
    }

    const callerEmail = userData.user.email;
    if (!isAdminEmail(callerEmail)) {
      return jsonResponse(
        req,
        { error: "This account is not allowed to enter results." },
        403,
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(req, { error: "Send JSON with a record object." }, 400);
    }

    const payload = asRecord(body);
    const record = asRecord(payload?.record);
    if (!record) {
      return jsonResponse(req, { error: "Missing required fields" }, 400);
    }

    const userId = readRequiredText(record.user_id);
    const testName = readRequiredText(record.test_name);
    if (!userId || !testName) {
      return jsonResponse(req, { error: "Missing required fields" }, 400);
    }
    if (!UUID_RE.test(userId)) {
      return jsonResponse(req, { error: "user_id must be a valid id." }, 400);
    }

    const testOrderId = readOptionalText(record.test_order_id);
    if (testOrderId && !UUID_RE.test(testOrderId)) {
      return jsonResponse(req, { error: "test_order_id must be a valid id, or blank." }, 400);
    }

    const flag = readOptionalText(record.flag);
    if (flag && !ALLOWED_FLAGS.includes(flag as (typeof ALLOWED_FLAGS)[number])) {
      return jsonResponse(req, { error: "flag is not an allowed value." }, 400);
    }

    // Whitelist only. Extra keys from the phone are ignored.
    const row = {
      user_id: userId,
      test_name: testName,
      plain_name: readOptionalText(record.plain_name),
      result_value: readOptionalText(record.result_value),
      result_unit: readOptionalText(record.result_unit),
      reference_range: readOptionalText(record.reference_range),
      flag,
      test_order_id: testOrderId,
      clinician_reviewed: true,
      reviewed_by: callerEmail ?? "admin",
      reviewed_at: new Date().toISOString(),
    };

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await adminClient
      .from("test_results")
      .insert(row)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Notify patient — never block the save if push fails or no token exists.
    let push: Awaited<ReturnType<typeof sendPushForUser>> | undefined;
    try {
      push = await sendPushForUser(adminClient, userId, "results_ready");
    } catch {
      push = undefined;
    }

    return jsonResponse(req, { data, push }, 200);
  } catch (error) {
    return jsonResponse(req, { error: String(error) }, 500);
  }
});
