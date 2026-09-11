// THIS IS AN EDGE FUNCTION (TypeScript), not SQL.
// Deploy: supabase functions deploy send-push
//
// SELF-CONTAINED — Supabase Dashboard only bundles this ONE file.
// Paste or upload index.ts only (do not rely on sibling files).
//
// Sends Expo push notifications for server-triggered events (results ready, plan approved).
// The service-role key lives in Deno.env only — never in the mobile or admin client.

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

// ----- push-events (inlined for single-file Dashboard deploy) -----

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_BATCH_SIZE = 100;

type PushEventType = "results_ready" | "plan_approved";

type PushEventPayload = {
  type: PushEventType;
  href: string;
};

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound: "default" | null;
  data: PushEventPayload;
};

const PUSH_COPY: Record<
  PushEventType,
  { title: string; body: string; href: string }
> = {
  results_ready: {
    title: "Your lab results are ready",
    body:
      "A clinician has reviewed your results. Open LifeShield to read them. This is information only — not a diagnosis.",
    href: "/(main)/(results)/lab-results",
  },
  plan_approved: {
    title: "Your plan is ready",
    body:
      "Your practitioner has finalised your plan. Open LifeShield to see what you can do next.",
    href: "/(main)/(plan)",
  },
};

function isPushEventType(value: string): value is PushEventType {
  return value === "results_ready" || value === "plan_approved";
}

function buildExpoPushMessages(
  event: PushEventType,
  tokens: string[],
): ExpoPushMessage[] {
  const copy = PUSH_COPY[event];
  return tokens.map((token) => ({
    to: token,
    title: copy.title,
    body: copy.body,
    sound: "default",
    data: {
      type: event,
      href: copy.href,
    },
  }));
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    return items.length > 0 ? [items] : [];
  }
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// ----- send-push-core (inlined) -----

type SendPushResult = {
  ok: boolean;
  tokens_found: number;
  sent: number;
  errors: string[];
};

type ExpoTicket = {
  status?: string;
  message?: string;
  details?: { error?: string };
};

function isExpoPushToken(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.startsWith("ExponentPushToken[") ||
    trimmed.startsWith("ExpoPushToken[")
  );
}

async function postExpoBatch(
  messages: ExpoPushMessage[],
): Promise<string[]> {
  const errors: string[] = [];

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    errors.push(
      `Expo push HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ""}`,
    );
    return errors;
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    errors.push("Expo push returned invalid JSON.");
    return errors;
  }

  const data = (payload as { data?: ExpoTicket[] })?.data;
  if (!Array.isArray(data)) {
    errors.push("Expo push response missing ticket data.");
    return errors;
  }

  for (const ticket of data) {
    if (ticket?.status === "error") {
      const detail = ticket.details?.error ?? ticket.message ?? "unknown";
      errors.push(`Expo ticket error: ${detail}`);
    }
  }

  return errors;
}

async function sendPushForUser(
  adminClient: SupabaseClient,
  userId: string,
  event: PushEventType,
): Promise<SendPushResult> {
  const result: SendPushResult = {
    ok: true,
    tokens_found: 0,
    sent: 0,
    errors: [],
  };

  try {
    const { data: rows, error } = await adminClient
      .from("push_tokens")
      .select("expo_push_token")
      .eq("user_id", userId);

    if (error) {
      result.ok = false;
      result.errors.push(error.message);
      return result;
    }

    const tokens = (rows ?? [])
      .map((row) => String(row.expo_push_token ?? "").trim())
      .filter((token) => token.length > 0 && isExpoPushToken(token));

    result.tokens_found = tokens.length;

    if (tokens.length === 0) {
      return result;
    }

    const messages = buildExpoPushMessages(event, tokens);
    const batches = chunkArray(messages, EXPO_PUSH_BATCH_SIZE);

    for (const batch of batches) {
      const batchErrors = await postExpoBatch(batch);
      if (batchErrors.length > 0) {
        result.errors.push(...batchErrors);
      } else {
        result.sent += batch.length;
      }
    }

    if (result.errors.length > 0 && result.sent === 0) {
      result.ok = false;
    }
  } catch (error) {
    result.ok = false;
    result.errors.push(String(error));
  }

  return result;
}

// ----- HTTP handler -----

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isLocalDevOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

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
  if (value == null || typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

async function callerMaySendPush(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  const { data: staffRows, error: staffError } = await adminClient
    .from("staff_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (staffError) {
    throw staffError;
  }

  const role = staffRows?.role;
  if (role === "owner" || role === "admin") {
    return true;
  }

  if (role !== "clinician") {
    return false;
  }

  const { data: doctor, error: doctorError } = await adminClient
    .from("doctors")
    .select("can_sign_off, active")
    .eq("auth_user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (doctorError) {
    throw doctorError;
  }

  return Boolean(doctor?.can_sign_off);
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
        {
          error:
            "Server is missing Supabase secrets. Set SUPABASE_SERVICE_ROLE_KEY in Edge Function secrets.",
        },
        500,
      );
    }

    const bearer = readBearerToken(req);
    if (!bearer) {
      return jsonResponse(req, { error: "Please sign in or use a service token." }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const isServiceCall = bearer === serviceRoleKey;
    if (!isServiceCall) {
      const authClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
      });
      const { data: userData, error: userError } = await authClient.auth.getUser(
        bearer,
      );
      if (userError || !userData.user) {
        return jsonResponse(
          req,
          { error: "Your session is not valid. Please sign in again." },
          401,
        );
      }

      const allowed = await callerMaySendPush(adminClient, userData.user.id);
      if (!allowed) {
        return jsonResponse(
          req,
          { error: "This account is not allowed to send push notifications." },
          403,
        );
      }
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(req, { error: "Send JSON with event and user_id." }, 400);
    }

    const payload = asRecord(body);
    const eventRaw = readOptionalText(payload?.event);
    const userId = readOptionalText(payload?.user_id);

    if (!eventRaw || !isPushEventType(eventRaw)) {
      return jsonResponse(
        req,
        { error: "event must be results_ready or plan_approved." },
        400,
      );
    }

    if (!userId || !UUID_RE.test(userId)) {
      return jsonResponse(req, { error: "user_id must be a valid id." }, 400);
    }

    const pushResult = await sendPushForUser(adminClient, userId, eventRaw);

    return jsonResponse(
      req,
      {
        data: {
          event: eventRaw,
          user_id: userId,
          ...pushResult,
        },
      },
      200,
    );
  } catch (error) {
    return jsonResponse(req, { error: String(error) }, 500);
  }
});
