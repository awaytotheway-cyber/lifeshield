/**
 * Update lab_orders.status — Edge Function first, SQL RPC fallback.
 */
import { supabaseClient } from "./supabaseClient";

export type UpdateLabOrderStatusOutcome =
  | { ok: true; status: string }
  | { ok: false; message: string };

function friendlyMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  return fallback;
}

async function callRpc(
  labOrderId: string,
  status: string,
): Promise<UpdateLabOrderStatusOutcome> {
  const { data, error } = await supabaseClient.rpc("update_lab_order_status", {
    p_lab_order_id: labOrderId,
    p_status: status,
  });

  if (error) {
    return {
      ok: false,
      message: friendlyMessage(
        error.message,
        "Could not update lab order. Run supabase/phase4-day5-lab-orders.sql in the SQL Editor, then try again.",
      ),
    };
  }

  const payload = data as { status?: string } | null;
  return { ok: true, status: String(payload?.status ?? status) };
}

export async function updateLabOrderStatus(
  labOrderId: string,
  status: string,
): Promise<UpdateLabOrderStatusOutcome> {
  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      return { ok: false, message: "Please sign in again." };
    }

    const { data, error } = await supabaseClient.functions.invoke(
      "update-lab-order-status",
      {
        body: { lab_order_id: labOrderId, status },
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!error && data && typeof data === "object" && !("error" in data)) {
      const payload = data as { data?: { status?: string } };
      const inner = payload.data ?? (data as { status?: string });
      return { ok: true, status: String(inner.status ?? status) };
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

    return await callRpc(labOrderId, status);
  } catch (error) {
    const rpc = await callRpc(labOrderId, status);
    if (rpc.ok) {
      return rpc;
    }
    return {
      ok: false,
      message: friendlyMessage(error, rpc.message),
    };
  }
}
