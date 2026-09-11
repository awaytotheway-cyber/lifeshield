// THIS IS AN EDGE FUNCTION (TypeScript), not SQL.
// Deploy: supabase functions deploy create-lab-order
//
// After a paid store order, creates lab_orders rows for test products.
// ManualLabProvider path — status pending_manual until admin fulfils.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { createLabOrdersForStoreOrder } from "./create-lab-orders.ts";

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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(req, { error: "Send JSON with store_order_id." }, 400);
    }

    const storeOrderId =
      typeof body === "object" &&
      body &&
      "store_order_id" in body &&
      typeof (body as { store_order_id: unknown }).store_order_id === "string"
        ? (body as { store_order_id: string }).store_order_id.trim()
        : "";

    if (!storeOrderId || !UUID_RE.test(storeOrderId)) {
      return jsonResponse(req, { error: "store_order_id must be a valid id." }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("user_id")
      .eq("id", storeOrderId)
      .maybeSingle();

    if (orderError) {
      throw orderError;
    }
    if (!order) {
      return jsonResponse(req, { error: "Store order not found." }, 404);
    }

    const { data: staffRow } = await adminClient
      .from("staff_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    const isAdminStaff =
      staffRow?.role === "owner" || staffRow?.role === "admin";

    if (!isAdminStaff && String(order.user_id) !== userData.user.id) {
      return jsonResponse(
        req,
        { error: "You can only create lab orders for your own store orders." },
        403,
      );
    }

    const result = await createLabOrdersForStoreOrder(adminClient, storeOrderId);

    return jsonResponse(req, { data: result }, 200);
  } catch (error) {
    return jsonResponse(req, { error: String(error) }, 500);
  }
});
