/**
 * Phase 4 Day 5 — create lab_orders after a paid store order.
 *
 * Tries the create-lab-order Edge Function first, then falls back to the
 * create_lab_orders_for_store_order() SQL helper (same pattern as sign-off).
 *
 * Failure here does NOT undo checkout — the store order is already saved.
 */
import { COPY } from "@/lib/copy";
import { messageFromUnknown, rawErrorText } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type LabOrderRow = {
  id: string;
  store_order_id: string | null;
  order_item_id: string | null;
  test_order_id: string | null;
  user_id: string;
  lab_provider: string | null;
  external_order_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type CreateLabOrdersOutcome =
  | { ok: true; createdCount: number; labOrderIds: string[]; usedFallback?: boolean }
  | { ok: false; message: string; needSql?: boolean };

function looksLikeMissingRpc(error: unknown): boolean {
  const text = rawErrorText(error).toLowerCase();
  return (
    text.includes("create_lab_orders_for_store_order") ||
    (text.includes("function") && text.includes("does not exist")) ||
    text.includes("pgrst202")
  );
}

function looksLikeMissingLabOrdersTable(error: unknown): boolean {
  const text = rawErrorText(error).toLowerCase();
  return (
    text.includes("lab_orders") &&
    (text.includes("does not exist") ||
      text.includes("schema cache") ||
      text.includes("pgrst205") ||
      text.includes("could not find the table"))
  );
}

function parseRpcPayload(data: unknown): CreateLabOrdersOutcome {
  if (!data || typeof data !== "object") {
    return { ok: true, createdCount: 0, labOrderIds: [] };
  }
  const payload = data as {
    created_count?: number;
    lab_order_ids?: string[];
  };
  const ids = Array.isArray(payload.lab_order_ids)
    ? payload.lab_order_ids.map(String)
    : [];
  return {
    ok: true,
    createdCount: Number(payload.created_count ?? ids.length),
    labOrderIds: ids,
    usedFallback: true,
  };
}

async function createViaRpc(storeOrderId: string): Promise<CreateLabOrdersOutcome> {
  const { data, error } = await supabase.rpc("create_lab_orders_for_store_order", {
    p_store_order_id: storeOrderId,
  });

  if (error) {
    if (looksLikeMissingRpc(error)) {
      return { ok: false, message: COPY.labOrdersNeedSql, needSql: true };
    }
    if (looksLikeMissingLabOrdersTable(error)) {
      return { ok: false, message: COPY.labOrdersNeedSql, needSql: true };
    }
    return {
      ok: false,
      message: messageFromUnknown(error, COPY.labOrdersCreateFailed),
    };
  }

  return parseRpcPayload(data);
}

async function createViaEdgeFunction(
  storeOrderId: string,
): Promise<CreateLabOrdersOutcome | { tryFallback: true; message?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    return { tryFallback: true, message: "Not signed in." };
  }

  const { data, error } = await supabase.functions.invoke("create-lab-order", {
    body: { store_order_id: storeOrderId },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!error && data && typeof data === "object" && !("error" in data)) {
    const payload = data as {
      data?: { created_count?: number; lab_order_ids?: string[] };
    };
    const inner = payload.data ?? (data as Record<string, unknown>);
    return parseRpcPayload(inner);
  }

  const edgeMessage =
    error?.message ??
    (typeof data === "object" && data && "error" in data
      ? String((data as { error?: string }).error)
      : "");

  const looksUnreachable =
    edgeMessage.toLowerCase().includes("failed to send") ||
    edgeMessage.toLowerCase().includes("not found") ||
    edgeMessage.toLowerCase().includes("404") ||
    edgeMessage.toLowerCase().includes("function");

  if (!looksUnreachable && edgeMessage) {
    return { ok: false, message: edgeMessage };
  }

  return { tryFallback: true, message: edgeMessage };
}

/**
 * After checkout saves a store order, create lab_orders for any test products.
 * Safe to call more than once — server logic is idempotent per order line.
 */
export async function createLabOrdersForStoreOrder(
  storeOrderId: string,
): Promise<CreateLabOrdersOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }
  if (!storeOrderId.trim()) {
    return { ok: false, message: COPY.labOrdersCreateFailed };
  }

  try {
    const edge = await createViaEdgeFunction(storeOrderId);
    if ("tryFallback" in edge) {
      const rpc = await createViaRpc(storeOrderId);
      if (rpc.ok) {
        return { ...rpc, usedFallback: true };
      }
      return rpc;
    }
    return edge;
  } catch (error) {
    try {
      const rpc = await createViaRpc(storeOrderId);
      if (rpc.ok) {
        return { ...rpc, usedFallback: true };
      }
      return {
        ok: false,
        message: messageFromUnknown(error, rpc.message),
      };
    } catch (inner) {
      return {
        ok: false,
        message: messageFromUnknown(inner, COPY.labOrdersCreateFailed),
      };
    }
  }
}

/** Patient reads their own lab order rows (status tracking). */
export async function loadOwnLabOrders(
  userId: string,
): Promise<
  | { ok: true; rows: LabOrderRow[] }
  | { ok: false; rows: []; message: string }
> {
  if (!isSupabaseConfigured) {
    return { ok: false, rows: [], message: COPY.missingKeys };
  }
  try {
    const { data, error } = await supabase
      .from("lab_orders")
      .select(
        "id, store_order_id, order_item_id, test_order_id, user_id, lab_provider, external_order_id, status, created_at, updated_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      throw error;
    }
    return {
      ok: true,
      rows: (data ?? []).map((row) => ({
        id: String((row as LabOrderRow).id),
        store_order_id: (row as LabOrderRow).store_order_id,
        order_item_id: (row as LabOrderRow).order_item_id,
        test_order_id: (row as LabOrderRow).test_order_id,
        user_id: String((row as LabOrderRow).user_id),
        lab_provider: (row as LabOrderRow).lab_provider,
        external_order_id: (row as LabOrderRow).external_order_id,
        status: String((row as LabOrderRow).status),
        created_at: String((row as LabOrderRow).created_at),
        updated_at: String((row as LabOrderRow).updated_at),
      })),
    };
  } catch (error) {
    if (looksLikeMissingLabOrdersTable(error)) {
      return { ok: false, rows: [], message: COPY.labOrdersNeedSql };
    }
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(error, COPY.labOrdersLoadFailed),
    };
  }
}
