/**
 * Call the sign-off Edge Function, with SQL RPC fallback.
 *
 * The browser never writes interventions directly — every approve / decline /
 * edit / finalise goes through server-side checks.
 */
import { supabaseClient } from "./supabaseClient";

export type SignOffAction = "approve" | "decline" | "edit" | "finalise_plan";

export type SignOffRequest = {
  action: SignOffAction;
  intervention_id?: string;
  patient_user_id?: string;
  dosage_note?: string;
};

export type SignOffOutcome =
  | { ok: true; data: Record<string, unknown> }
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

async function callRpc(request: SignOffRequest): Promise<SignOffOutcome> {
  const { data, error } = await supabaseClient.rpc("sign_off_intervention", {
    p_action: request.action,
    p_intervention_id: request.intervention_id ?? null,
    p_patient_user_id: request.patient_user_id ?? null,
    p_dosage_note: request.dosage_note ?? null,
  });

  if (error) {
    return {
      ok: false,
      message: friendlyMessage(
        error.message,
        "Could not save your review. Run supabase/phase4-day4-sign-off.sql in the SQL Editor, then try again.",
      ),
    };
  }

  return { ok: true, data: (data as Record<string, unknown>) ?? {} };
}

/**
 * Try Edge Function first; if it is missing or unreachable, use Postgres RPC.
 */
export async function signOffIntervention(
  request: SignOffRequest,
): Promise<SignOffOutcome> {
  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      return { ok: false, message: "Please sign in again." };
    }

    const { data, error } = await supabaseClient.functions.invoke(
      "sign-off-intervention",
      {
        body: request,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!error && data && typeof data === "object" && !("error" in data)) {
      const payload = data as { data?: Record<string, unknown> };
      return { ok: true, data: payload.data ?? (data as Record<string, unknown>) };
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

    return await callRpc(request);
  } catch (error) {
    const rpc = await callRpc(request);
    if (rpc.ok) {
      return rpc;
    }
    return {
      ok: false,
      message: friendlyMessage(error, rpc.message),
    };
  }
}
