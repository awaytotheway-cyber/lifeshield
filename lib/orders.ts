/**
 * Phase 3 Day 5–6 — store orders after checkout; tracking UI reads status from Supabase.
 *
 * Prices are snapshotted from cart rows at purchase time.
 * payment_status is optimistic "paid" for UX; stripe-webhook Edge Function reconciles.
 */
import { COPY } from "@/lib/copy";
import { messageFromUnknown, rawErrorText } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { CartLineRow } from "@/lib/store";

export type StoreOrderRow = {
  id: string;
  total_amount: number;
  currency: string;
  payment_status: string;
  fulfilment_status: string;
  payment_provider: string | null;
  payment_ref: string | null;
  created_at: string;
};

export type StoreOrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  product_type?: "supplement" | "test" | null;
};

export type OrderTimelineStep = {
  label: string;
  detail: string;
  done: boolean;
  current: boolean;
};

export type CreateOrderInput = {
  userId: string;
  lines: CartLineRow[];
  totalAmount: number;
  currency: string;
  paymentRef: string | null;
  paymentProvider: "stripe";
};

type CreateOrderOutcome =
  | { ok: true; orderId: string }
  | { ok: false; message: string; needRpc?: boolean };

type LoadOrdersOutcome =
  | { ok: true; orders: StoreOrderRow[] }
  | { ok: false; orders: []; message: string };

type LoadOrderDetailOutcome =
  | {
      ok: true;
      order: StoreOrderRow;
      items: StoreOrderItemRow[];
    }
  | { ok: false; message: string };

function looksLikeMissingOrdersTable(error: unknown): boolean {
  const text = rawErrorText(error).toLowerCase();
  return (
    text.includes("orders") &&
    (text.includes("does not exist") ||
      text.includes("schema cache") ||
      text.includes("pgrst205") ||
      text.includes("could not find the table"))
  );
}

function looksLikeMissingRpc(error: unknown): boolean {
  const text = rawErrorText(error).toLowerCase();
  return (
    text.includes("create_order_from_cart") ||
    (text.includes("function") && text.includes("does not exist")) ||
    text.includes("pgrst202")
  );
}

function looksLikeRlsBlock(error: unknown): boolean {
  const text = rawErrorText(error).toLowerCase();
  return (
    text.includes("row-level security") ||
    text.includes("42501") ||
    text.includes("permission denied") ||
    text.includes("new row violates")
  );
}

function normalizeOrder(row: Record<string, unknown>): StoreOrderRow {
  return {
    id: String(row.id),
    total_amount: Number(row.total_amount),
    currency: String(row.currency ?? "INR"),
    payment_status: String(row.payment_status ?? "pending"),
    fulfilment_status: String(row.fulfilment_status ?? "awaiting_payment"),
    payment_provider: row.payment_provider ? String(row.payment_provider) : null,
    payment_ref: row.payment_ref ? String(row.payment_ref) : null,
    created_at: String(row.created_at ?? ""),
  };
}

function normalizeOrderItem(row: Record<string, unknown>): StoreOrderItemRow {
  const nested = row.products;
  let productType: StoreOrderItemRow["product_type"] = null;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const type = (nested as { product_type?: unknown }).product_type;
    if (type === "supplement" || type === "test") {
      productType = type;
    }
  }

  return {
    id: String(row.id),
    order_id: String(row.order_id),
    product_id: row.product_id ? String(row.product_id) : null,
    product_name: String(row.product_name ?? ""),
    unit_price: Number(row.unit_price),
    quantity: Number(row.quantity),
    product_type: productType,
  };
}

export function orderIncludesTests(items: StoreOrderItemRow[]): boolean {
  return items.some((item) => item.product_type === "test");
}

/** Plain-language status for the orders list and detail header. */
export function formatOrderStatus(
  order: StoreOrderRow,
  items?: StoreOrderItemRow[],
): string {
  if (order.payment_status === "refunded") {
    return COPY.orderStatusRefunded;
  }
  if (order.payment_status === "failed") {
    return COPY.orderStatusFailed;
  }
  if (order.fulfilment_status === "cancelled") {
    return COPY.orderStatusCancelled;
  }
  if (order.payment_status === "paid") {
    if (
      order.fulfilment_status === "processing" ||
      order.fulfilment_status === "awaiting_payment"
    ) {
      return COPY.orderStatusPaidPreparing;
    }
    if (order.fulfilment_status === "shipped") {
      const hasTests = items ? orderIncludesTests(items) : false;
      return hasTests ? COPY.orderStatusSampleKitOnWay : COPY.orderStatusShipped;
    }
    if (order.fulfilment_status === "delivered") {
      return COPY.orderStatusDelivered;
    }
    if (order.fulfilment_status === "sample_collected") {
      return COPY.orderStatusSampleCollected;
    }
  }
  if (order.payment_status === "pending") {
    return COPY.orderStatusPending;
  }
  return COPY.orderStatusOther;
}

/** Plain-language payment + fulfilment timeline for order detail. */
export function buildOrderTimeline(
  order: StoreOrderRow,
  items: StoreOrderItemRow[],
): OrderTimelineStep[] {
  const hasTests = orderIncludesTests(items);
  const placedDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString()
    : "";

  const paymentDone = order.payment_status === "paid";
  const paymentFailed = order.payment_status === "failed";
  const paymentCurrent =
    order.payment_status === "pending" && !paymentFailed;

  const preparingDone =
    paymentDone &&
    ["processing", "shipped", "delivered", "sample_collected"].includes(
      order.fulfilment_status,
    );
  const preparingCurrent =
    paymentDone && order.fulfilment_status === "processing";

  const shippedDone =
    paymentDone &&
    ["shipped", "delivered", "sample_collected"].includes(
      order.fulfilment_status,
    );
  const shippedCurrent =
    paymentDone && order.fulfilment_status === "shipped";

  const completeDone =
    paymentDone &&
    (order.fulfilment_status === "delivered" ||
      order.fulfilment_status === "sample_collected");
  const completeCurrent =
    paymentDone &&
    (order.fulfilment_status === "delivered" ||
      order.fulfilment_status === "sample_collected");

  const steps: OrderTimelineStep[] = [
    {
      label: COPY.orderTimelinePlaced,
      detail: placedDate ? COPY.orderTimelinePlacedDetail.replace("{date}", placedDate) : COPY.orderTimelinePlacedDetailNoDate,
      done: true,
      current: false,
    },
    {
      label: paymentFailed
        ? COPY.orderTimelinePaymentFailed
        : paymentDone
          ? COPY.orderTimelinePaymentConfirmed
          : COPY.orderTimelinePaymentPending,
      detail: paymentFailed
        ? COPY.orderTimelinePaymentFailedDetail
        : paymentDone
          ? COPY.orderTimelinePaymentConfirmedDetail
          : COPY.orderTimelinePaymentPendingDetail,
      done: paymentDone,
      current: paymentCurrent,
    },
  ];

  if (paymentFailed || order.fulfilment_status === "cancelled") {
    steps.push({
      label: COPY.orderTimelineCancelled,
      detail: COPY.orderTimelineCancelledDetail,
      done: true,
      current: true,
    });
    return steps;
  }

  steps.push({
    label: COPY.orderTimelinePreparing,
    detail: COPY.orderTimelinePreparingDetail,
    done: preparingDone,
    current: preparingCurrent,
  });

  steps.push({
    label: hasTests
      ? COPY.orderTimelineSampleKit
      : COPY.orderTimelineShipped,
    detail: hasTests
      ? COPY.orderTimelineSampleKitDetail
      : COPY.orderTimelineShippedDetail,
    done: shippedDone,
    current: shippedCurrent,
  });

  steps.push({
    label: hasTests
      ? COPY.orderTimelineSampleCollected
      : COPY.orderTimelineDelivered,
    detail: hasTests
      ? COPY.orderTimelineSampleCollectedDetail
      : COPY.orderTimelineDeliveredDetail,
    done: completeDone,
    current: completeCurrent,
  });

  return steps;
}

async function clearCartForUser(
  userId: string,
  cartItemIds: string[],
): Promise<void> {
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", userId)
    .in("id", cartItemIds);
  if (error) {
    throw error;
  }
}

async function createOrderViaRls(
  input: CreateOrderInput,
): Promise<CreateOrderOutcome> {
  const cartItemIds = input.lines.map((line) => line.id);
  const currency = input.currency.toUpperCase();

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: input.userId,
      total_amount: input.totalAmount,
      currency,
      // Optimistic paid — Day 6 Stripe webhook is the source of truth.
      payment_status: "paid",
      payment_provider: input.paymentProvider,
      payment_ref: input.paymentRef,
      fulfilment_status: "processing",
    })
    .select("id")
    .single();

  if (orderError) {
    throw orderError;
  }

  const orderId = String((orderRow as { id: string }).id);

  const itemRows = input.lines.map((line) => ({
    order_id: orderId,
    product_id: line.product_id,
    product_name: line.product.plain_name,
    unit_price: line.product.price,
    quantity: line.quantity,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(itemRows);
  if (itemsError) {
    throw itemsError;
  }

  await clearCartForUser(input.userId, cartItemIds);
  return { ok: true, orderId };
}

async function createOrderViaRpc(
  input: CreateOrderInput,
): Promise<CreateOrderOutcome> {
  const cartItemIds = input.lines.map((line) => line.id);
  const { data, error } = await supabase.rpc("create_order_from_cart", {
    p_cart_item_ids: cartItemIds,
    p_total_amount: input.totalAmount,
    p_currency: input.currency.toUpperCase(),
    p_payment_ref: input.paymentRef,
    p_payment_provider: input.paymentProvider,
  });

  if (error) {
    if (looksLikeMissingRpc(error)) {
      return { ok: false, message: COPY.checkoutOrderNeedRpc, needRpc: true };
    }
    throw error;
  }

  const orderId = typeof data === "string" ? data : String(data ?? "");
  if (!orderId) {
    return { ok: false, message: COPY.checkoutOrderSaveFailed };
  }
  return { ok: true, orderId };
}

/**
 * After Payment Sheet succeeds, snapshot the cart into orders + order_items.
 * Tries normal RLS inserts first; falls back to create_order_from_cart RPC.
 */
export async function createOrderFromCart(
  input: CreateOrderInput,
): Promise<CreateOrderOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }
  if (input.lines.length === 0) {
    return { ok: false, message: COPY.checkoutEmptyCart };
  }

  try {
    const direct = await createOrderViaRls(input);
    return direct;
  } catch (error) {
    if (looksLikeMissingOrdersTable(error)) {
      return { ok: false, message: COPY.storeNeedSql };
    }
    if (!looksLikeRlsBlock(error)) {
      return {
        ok: false,
        message: messageFromUnknown(error, COPY.checkoutOrderSaveFailed),
      };
    }
  }

  try {
    return await createOrderViaRpc(input);
  } catch (error) {
    if (looksLikeMissingOrdersTable(error)) {
      return { ok: false, message: COPY.storeNeedSql };
    }
    return {
      ok: false,
      message: messageFromUnknown(error, COPY.checkoutOrderSaveFailed),
    };
  }
}

export async function loadOwnOrders(userId: string): Promise<LoadOrdersOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, orders: [], message: COPY.missingKeys };
  }
  try {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, total_amount, currency, payment_status, fulfilment_status, payment_provider, payment_ref, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      throw error;
    }
    return {
      ok: true,
      orders: (data ?? []).map((row) =>
        normalizeOrder(row as Record<string, unknown>),
      ),
    };
  } catch (error) {
    if (looksLikeMissingOrdersTable(error)) {
      return { ok: false, orders: [], message: COPY.storeNeedSql };
    }
    return {
      ok: false,
      orders: [],
      message: messageFromUnknown(error, COPY.ordersLoadFailed),
    };
  }
}

export async function loadOrderDetail(
  userId: string,
  orderId: string,
): Promise<LoadOrderDetailOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }
  try {
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, total_amount, currency, payment_status, fulfilment_status, payment_provider, payment_ref, created_at",
      )
      .eq("id", orderId)
      .eq("user_id", userId)
      .maybeSingle();
    if (orderError) {
      throw orderError;
    }
    if (!orderData) {
      return { ok: false, message: COPY.orderMissing };
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
      .select(
        "id, order_id, product_id, product_name, unit_price, quantity, products (product_type)",
      )
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    if (itemsError) {
      throw itemsError;
    }

    return {
      ok: true,
      order: normalizeOrder(orderData as Record<string, unknown>),
      items: (itemsData ?? []).map((row) =>
        normalizeOrderItem(row as Record<string, unknown>),
      ),
    };
  } catch (error) {
    if (looksLikeMissingOrdersTable(error)) {
      return { ok: false, message: COPY.storeNeedSql };
    }
    return {
      ok: false,
      message: messageFromUnknown(error, COPY.ordersLoadFailed),
    };
  }
}

/** True when the signed-in user has at least one store order (for Home link). */
export async function hasOwnStoreOrders(
  userId: string,
): Promise<{ ok: true; hasRows: boolean } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }
  try {
    const { count, error } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) {
      throw error;
    }
    return { ok: true, hasRows: (count ?? 0) > 0 };
  } catch (error) {
    if (looksLikeMissingOrdersTable(error)) {
      return { ok: false, message: COPY.storeNeedSql };
    }
    return {
      ok: false,
      message: messageFromUnknown(error, COPY.ordersLoadFailed),
    };
  }
}
