// THIS IS AN EDGE FUNCTION (TypeScript), not SQL.
// Deploy: supabase functions deploy update-lab-order-status
//
// Admin / clinic_staff update lab_orders.status (kit dispatched, etc.).

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_STATUSES = new Set([
  "pending_manual",
  "created",
  "kit_dispatched",
  "sample_received",
  "processing",
  "resulted",
  "cancelled",
]);

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

async function callerCanUpdateLabOrders(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  const { data: staffRow, error } = await adminClient
    .from("staff_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const role = staffRow?.role;
  return role === "owner" || role === "admin" || role === "clinic_staff";
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

    const jwt = readBearerToken(req);
    if (!jwt) {
      return jsonResponse(req, { error: "Please sign in first." }, 401);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(jwt);
    if (userError || !userData.user) {
      return jsonResponse(
        req,
        { error: "Your session is not valid. Please sign in again." },
        401,
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const allowed = await callerCanUpdateLabOrders(adminClient, userData.user.id);
    if (!allowed) {
      return jsonResponse(
        req,
        { error: "Only admin or clinic staff can update lab order status." },
        403,
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(req, { error: "Send JSON with lab_order_id and status." }, 400);
    }

    const payload = body as { lab_order_id?: string; status?: string };
    const labOrderId = payload.lab_order_id?.trim() ?? "";
    const status = payload.status?.trim().toLowerCase() ?? "";

    if (!labOrderId || !UUID_RE.test(labOrderId)) {
      return jsonResponse(req, { error: "lab_order_id must be a valid id." }, 400);
    }
    if (!ALLOWED_STATUSES.has(status)) {
      return jsonResponse(req, { error: "Invalid status value." }, 400);
    }

    const { data, error } = await adminClient
      .from("lab_orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", labOrderId)
      .select("id, status")
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return jsonResponse(req, { error: "Lab order not found." }, 404);
    }

    return jsonResponse(req, { data }, 200);
  } catch (error) {
    return jsonResponse(req, { error: String(error) }, 500);
  }
});
