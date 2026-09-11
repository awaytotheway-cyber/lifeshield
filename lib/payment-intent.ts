/**
 * Day 4 — ask the server for the real cart total and a Stripe PaymentIntent.
 *
 * The app sends only cart item ids. It never sends an amount to charge.
 * Stripe secret key stays in the Edge Function; publishable key is for Day 5.
 */
import { COPY } from "@/lib/copy";
import { messageFromUnknown, rawErrorText } from "@/lib/friendly-errors";
import { looksLikeUnreachableFunction } from "@/lib/result-entry-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type PaymentIntentSuccess = {
  ok: true;
  clientSecret: string;
  total: number;
  currency: string;
};

export type PaymentIntentOutcome =
  | PaymentIntentSuccess
  | { ok: false; message: string };

export { formatPaymentIntentSuccessMessage } from "@/lib/payment-intent-format";

function readInvokeStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  const ctx = (error as { context?: { status?: number } }).context;
  if (typeof ctx?.status === "number") {
    return ctx.status;
  }
  return undefined;
}

function messageFromFunctionBody(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const record = data as Record<string, unknown>;
  if (typeof record.error === "string" && record.error.trim().length > 0) {
    return record.error.trim();
  }
  return null;
}

/**
 * Calls create-payment-intent with cart row ids only.
 * Session JWT is attached automatically by the Supabase client.
 */
export async function requestPaymentIntent(
  cartItemIds: string[],
): Promise<PaymentIntentOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }

  if (cartItemIds.length === 0) {
    return { ok: false, message: COPY.checkoutEmptyCart };
  }

  try {
    const { data, error } = await supabase.functions.invoke(
      "create-payment-intent",
      { body: { cartItemIds } },
    );

    const status = readInvokeStatus(error);
    const fromBody = messageFromFunctionBody(data);

    if (error) {
      if (looksLikeUnreachableFunction(error, status) || looksLikeUnreachableFunction(fromBody)) {
        return { ok: false, message: COPY.checkoutFunctionMissing };
      }
      return {
        ok: false,
        message: messageFromUnknown(error, fromBody ?? COPY.checkoutIntentFailed),
      };
    }

    if (fromBody) {
      if (looksLikeUnreachableFunction(fromBody)) {
        return { ok: false, message: COPY.checkoutFunctionMissing };
      }
      return { ok: false, message: fromBody };
    }

    if (!data || typeof data !== "object") {
      return { ok: false, message: COPY.checkoutIntentFailed };
    }

    const record = data as Record<string, unknown>;
    const clientSecret =
      typeof record.clientSecret === "string" ? record.clientSecret : null;
    const total =
      typeof record.total === "number"
        ? record.total
        : Number(record.total);
    const currency =
      typeof record.currency === "string" ? record.currency : "inr";

    if (!clientSecret || !Number.isFinite(total)) {
      return { ok: false, message: COPY.checkoutIntentFailed };
    }

    return {
      ok: true,
      clientSecret,
      total,
      currency,
    };
  } catch (error) {
    if (looksLikeUnreachableFunction(error)) {
      return { ok: false, message: COPY.checkoutFunctionMissing };
    }
    return {
      ok: false,
      message: messageFromUnknown(error, COPY.checkoutIntentFailed),
    };
  }
}

/** For tests — detect deploy / CORS failures from raw error text. */
export function paymentIntentLooksUnreachable(error: unknown): boolean {
  return looksLikeUnreachableFunction(error) ||
    rawErrorText(error).toLowerCase().includes("create-payment-intent");
}
