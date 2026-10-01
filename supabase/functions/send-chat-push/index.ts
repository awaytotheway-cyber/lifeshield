// THIS IS AN EDGE FUNCTION (TypeScript), not SQL.
// Deploy: supabase functions deploy send-chat-push
//
// Sends an Expo push notification to the OTHER party of a buddy chat
// message. The caller must be authenticated and be a party of the
// referenced ACTIVE connection.

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_BATCH_SIZE = 100;

type ChatPushPayload = { type: "chat_message"; connection_id: string; href: string };

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound: "default" | null;
  data: ChatPushPayload;
};

function isExpoPushToken(v: string): boolean {
  const t = v.trim();
  return t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken[");
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  if (size <= 0) return items.length > 0 ? [items] : [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  return {
    "Access-Control-Allow-Origin": isLocal ? origin : "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-api-version, prefer",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
}

function json(req: Request, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(req) });
}

function readBearer(req: Request): string | null {
  const h = req.headers.get("Authorization") ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  const t = m?.[1]?.trim();
  return t && t.length > 0 ? t : null;
}

async function postExpoBatch(messages: ExpoPushMessage[]): Promise<string[]> {
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
    errors.push(`Expo push HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
    return errors;
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    errors.push("Expo push returned invalid JSON.");
    return errors;
  }
  const data = (payload as { data?: { status?: string; message?: string }[] })?.data;
  if (!Array.isArray(data)) {
    errors.push("Expo push response missing ticket data.");
    return errors;
  }
  for (const ticket of data) {
    if (ticket?.status === "error") {
      errors.push(`Expo ticket error: ${ticket.message ?? "unknown"}`);
    }
  }
  return errors;
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(req) });
    }
    if (req.method !== "POST") return json(req, { error: "Use POST" }, 405);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json(req, { error: "Missing Supabase env" }, 500);
    }

    const bearer = readBearer(req);
    if (!bearer) return json(req, { error: "Sign in first." }, 401);

    // Caller-scoped client (RLS enforces they must be on the connection).
    const caller: SupabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });

    const { data: userData, error: userErr } = await caller.auth.getUser(bearer);
    if (userErr || !userData?.user?.id) return json(req, { error: "Auth failed." }, 401);
    const senderId = userData.user.id;

    const body = (await req.json().catch(() => null)) as
      | { connection_id?: string; preview?: string }
      | null;
    const connectionId = body?.connection_id?.trim();
    if (!connectionId) return json(req, { error: "connection_id required" }, 400);
    const preview = (body?.preview ?? "").trim().slice(0, 120);

    // Confirm caller is on this ACTIVE connection.
    const { data: conn, error: connErr } = await caller
      .from("connections")
      .select("id, requester_id, addressee_id, status")
      .eq("id", connectionId)
      .maybeSingle();
    if (connErr) return json(req, { error: connErr.message }, 500);
    if (!conn) return json(req, { error: "Connection not found." }, 404);
    if (conn.status !== "active") return json(req, { ok: true, skipped: "not_active" }, 200);
    if (![conn.requester_id, conn.addressee_id].includes(senderId)) {
      return json(req, { error: "Not a party of this connection." }, 403);
    }
    const recipientId = conn.requester_id === senderId ? conn.addressee_id : conn.requester_id;

    // Fetch recipient sender-name and push tokens with service role.
    const admin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey);
    const [senderProfile, tokenRows] = await Promise.all([
      admin.from("profiles").select("full_name, buddy_display_name").eq("id", senderId).maybeSingle(),
      admin.from("push_tokens").select("expo_push_token").eq("user_id", recipientId),
    ]);
    const senderName =
      (senderProfile.data?.buddy_display_name as string | undefined) ||
      (senderProfile.data?.full_name as string | undefined)?.split(" ")[0] ||
      "A buddy";

    const tokens = (tokenRows.data ?? [])
      .map((r) => String(r.expo_push_token ?? "").trim())
      .filter((t) => t.length > 0 && isExpoPushToken(t));
    if (tokens.length === 0) return json(req, { ok: true, tokens_found: 0 }, 200);

    const messages: ExpoPushMessage[] = tokens.map((to) => ({
      to,
      title: `${senderName} sent you a message`,
      body: preview || "Open PRESCOPE to see it.",
      sound: "default",
      data: {
        type: "chat_message",
        connection_id: connectionId,
        href: `/(main)/(buddies)/chat?id=${connectionId}`,
      },
    }));

    const errors: string[] = [];
    let sent = 0;
    for (const batch of chunkArray(messages, EXPO_PUSH_BATCH_SIZE)) {
      const batchErrors = await postExpoBatch(batch);
      if (batchErrors.length > 0) errors.push(...batchErrors);
      else sent += batch.length;
    }

    return json(req, { ok: errors.length === 0 || sent > 0, sent, errors }, 200);
  } catch (error) {
    return json(req, { error: String(error) }, 500);
  }
});
