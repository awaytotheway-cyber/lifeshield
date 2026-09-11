// THIS IS AN EDGE FUNCTION (TypeScript), not SQL.
// Do not paste this file into the SQL Editor.
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
//
// Stripe webhook secret + service-role key live in Deno.env only. Never in the app.
// Stripe calls this URL directly — no Supabase JWT. Use --no-verify-jwt when deploying.

import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.7.0";
import { createLabOrdersForStoreOrder } from "./create-lab-orders.ts";

const FULFILMENT_RANK: Record<string, number> = {
  awaiting_payment: 0,
  processing: 1,
  shipped: 2,
  delivered: 3,
  sample_collected: 3,
  cancelled: -1,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fulfilmentAtLeast(current: string, target: string): boolean {
  const currentRank = FULFILMENT_RANK[current] ?? 0;
  const targetRank = FULFILMENT_RANK[target] ?? 0;
  if (currentRank < 0) {
    return false;
  }
  return currentRank >= targetRank;
}

async function markOrderPaid(
  adminClient: ReturnType<typeof createClient>,
  paymentIntentId: string,
): Promise<{ updated: boolean; orderId?: string; reason?: string }> {
  const { data: rows, error: findError } = await adminClient
    .from("orders")
    .select("id, payment_status, fulfilment_status")
    .eq("payment_ref", paymentIntentId)
    .limit(2);

  if (findError) {
    throw findError;
  }

  const matches = rows ?? [];
  if (matches.length === 0) {
    return {
      updated: false,
      reason:
        "No order row matched this payment intent yet. The app may save the order after checkout.",
    };
  }
  if (matches.length > 1) {
    return {
      updated: false,
      reason: "Multiple orders share the same payment_ref — skipped for safety.",
    };
  }

  const order = matches[0] as {
    id: string;
    payment_status: string;
    fulfilment_status: string;
  };

  const nextFulfilment = fulfilmentAtLeast(order.fulfilment_status, "processing")
    ? order.fulfilment_status
    : "processing";

  const { error: updateError } = await adminClient
    .from("orders")
    .update({
      payment_status: "paid",
      fulfilment_status: nextFulfilment,
      payment_provider: "stripe",
    })
    .eq("id", order.id);

  if (updateError) {
    throw updateError;
  }

  return { updated: true, orderId: order.id };
}

async function markOrderFailed(
  adminClient: ReturnType<typeof createClient>,
  paymentIntentId: string,
): Promise<{ updated: boolean; orderId?: string; reason?: string }> {
  const { data: row, error: findError } = await adminClient
    .from("orders")
    .select("id, payment_status")
    .eq("payment_ref", paymentIntentId)
    .maybeSingle();

  if (findError) {
    throw findError;
  }
  if (!row) {
    return {
      updated: false,
      reason: "No order row matched this failed payment intent.",
    };
  }

  const { error: updateError } = await adminClient
    .from("orders")
    .update({
      payment_status: "failed",
      fulfilment_status: "cancelled",
    })
    .eq("id", (row as { id: string }).id);

  if (updateError) {
    throw updateError;
  }

  return { updated: true, orderId: (row as { id: string }).id };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Use POST" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!supabaseUrl || !serviceRoleKey) {
    return json(
      {
        error:
          "Server is missing Supabase secrets. Set SUPABASE_SERVICE_ROLE_KEY in Edge Function secrets.",
      },
      500,
    );
  }

  if (!stripeSecret?.trim()) {
    return json(
      {
        error:
          "Stripe is not set up yet. Set STRIPE_SECRET_KEY in Supabase → Edge Functions → Secrets.",
      },
      500,
    );
  }

  if (!webhookSecret?.trim()) {
    return json(
      {
        error:
          "Webhook secret missing. Set STRIPE_WEBHOOK_SECRET from Stripe → Webhooks → Signing secret.",
      },
      500,
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return json({ error: "Missing stripe-signature header." }, 400);
  }

  const rawBody = await req.text();
  const stripe = new Stripe(stripeSecret, {
    apiVersion: "2024-11-20.acacia",
  });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    return json(
      { error: `Webhook signature check failed: ${String(error)}` },
      400,
    );
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const result = await markOrderPaid(adminClient, intent.id);
        let labOrders: { created_count: number; lab_order_ids: string[] } | null =
          null;
        if (result.updated && result.orderId) {
          try {
            labOrders = await createLabOrdersForStoreOrder(
              adminClient,
              result.orderId,
            );
          } catch {
            // Idempotent retry on next webhook delivery if lab_orders step fails.
            labOrders = null;
          }
        }
        return json({
          received: true,
          type: event.type,
          payment_intent: intent.id,
          ...result,
          lab_orders: labOrders,
        });
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const result = await markOrderFailed(adminClient, intent.id);
        return json({
          received: true,
          type: event.type,
          payment_intent: intent.id,
          ...result,
        });
      }
      default:
        // Acknowledge events we do not handle yet so Stripe does not retry forever.
        return json({ received: true, type: event.type, handled: false });
    }
  } catch (error) {
    return json({ error: String(error) }, 500);
  }
});
