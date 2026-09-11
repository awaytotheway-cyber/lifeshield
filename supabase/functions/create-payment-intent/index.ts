// THIS IS AN EDGE FUNCTION (TypeScript), not SQL.
// Do not paste this file into the SQL Editor.
// Deploy: supabase functions deploy create-payment-intent
//
// Stripe secret key + service-role key live in Deno.env only. Never in the app.

import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.7.0";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isLocalDevOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

// Expo web (localhost:8081) sends a preflight OPTIONS request first.
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

function readCartItemIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      return null;
    }
    const trimmed = item.trim();
    if (!UUID_RE.test(trimmed)) {
      return null;
    }
    ids.push(trimmed);
  }
  return ids;
}

type ProductRow = {
  price: number;
  plain_name: string;
  active: boolean;
  currency: string | null;
};

type CartRow = {
  id: string;
  quantity: number;
  user_id: string;
  products: ProductRow | ProductRow[] | null;
};

function readProduct(row: CartRow): ProductRow | null {
  const nested = row.products;
  if (!nested) {
    return null;
  }
  if (Array.isArray(nested)) {
    return nested[0] ?? null;
  }
  return nested;
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
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse(
        req,
        {
          error:
            "Server is missing Supabase secrets. Ask your developer to set SUPABASE_SERVICE_ROLE_KEY.",
        },
        500,
      );
    }

    if (!stripeSecret || stripeSecret.trim().length === 0) {
      return jsonResponse(
        req,
        {
          error:
            "Stripe is not set up on the server yet. Add STRIPE_SECRET_KEY in Supabase → Edge Functions → Secrets.",
        },
        500,
      );
    }

    const jwt = readBearerToken(req);
    if (!jwt) {
      return jsonResponse(req, { error: "Please sign in first." }, 401);
    }

    // Who is calling? Never trust a userId sent from the phone.
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(
      jwt,
    );
    if (userError || !userData.user) {
      return jsonResponse(
        req,
        { error: "Your session is not valid. Please sign in again." },
        401,
      );
    }
    const userId = userData.user.id;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        req,
        { error: "Send JSON with cartItemIds (an array of cart row ids)." },
        400,
      );
    }

    const payload = asRecord(body);
    const cartItemIds = readCartItemIds(payload?.cartItemIds);
    if (!cartItemIds) {
      return jsonResponse(
        req,
        {
          error:
            "cartItemIds must be a non-empty array of valid cart item ids. The app must not send a price.",
        },
        400,
      );
    }

    // Service role reads real prices — the phone never sends amounts.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: rows, error: cartError } = await adminClient
      .from("cart_items")
      .select(
        "id, quantity, user_id, products (price, plain_name, active, currency)",
      )
      .eq("user_id", userId)
      .in("id", cartItemIds);

    if (cartError) {
      throw cartError;
    }

    const items = (rows ?? []) as CartRow[];
    if (items.length !== cartItemIds.length) {
      return jsonResponse(
        req,
        {
          error:
            "Some cart items were not found or do not belong to your account. Refresh your cart and try again.",
        },
        400,
      );
    }

    let totalRupees = 0;
    let currency = "inr";
    for (const row of items) {
      const product = readProduct(row);
      if (!product) {
        return jsonResponse(
          req,
          { error: "A product in your cart is no longer available." },
          400,
        );
      }
      if (!product.active) {
        return jsonResponse(
          req,
          {
            error: `"${product.plain_name}" is no longer available. Remove it from your cart.`,
          },
          400,
        );
      }
      const price = Number(product.price);
      const qty = Number(row.quantity);
      if (!Number.isFinite(price) || price < 0 || !Number.isFinite(qty) || qty < 1) {
        return jsonResponse(
          req,
          { error: "Cart data looks invalid. Please refresh your cart." },
          400,
        );
      }
      totalRupees += price * qty;
      if (product.currency) {
        currency = product.currency.toLowerCase();
      }
    }

    if (totalRupees <= 0) {
      return jsonResponse(req, { error: "Cart total must be greater than zero." }, 400);
    }

    // Stripe expects the smallest currency unit (paise for INR).
    const amountPaise = Math.round(totalRupees * 100);
    if (amountPaise < 50) {
      return jsonResponse(
        req,
        { error: "Order total is below the minimum charge amount." },
        400,
      );
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2024-11-20.acacia",
    });

    const intent = await stripe.paymentIntents.create({
      amount: amountPaise,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        user_id: userId,
        cart_item_ids: cartItemIds.join(","),
      },
    });

    if (!intent.client_secret) {
      throw new Error("Stripe did not return a client secret.");
    }

    return jsonResponse(
      req,
      {
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        total: totalRupees,
        currency,
      },
      200,
    );
  } catch (error) {
    return jsonResponse(req, { error: String(error) }, 500);
  }
});
