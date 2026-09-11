/**
 * Push send logic (local copy for deploy).
 * Keep in sync with supabase/functions/_shared/send-push-core.ts.
 */
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

import {
  buildExpoPushMessages,
  chunkArray,
  EXPO_PUSH_BATCH_SIZE,
  EXPO_PUSH_URL,
  type PushEventType,
} from "./push-events.ts";

export type SendPushResult = {
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
  messages: ReturnType<typeof buildExpoPushMessages>,
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

/**
 * Look up device tokens and send a push for one patient.
 * Safe to call from save-reviewed-result / sign-off-intervention — never throws.
 */
export async function sendPushForUser(
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
