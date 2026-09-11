import { useState } from "react";
import { Text } from "react-native";
import { useStripe } from "@stripe/stripe-react-native";

import { Button } from "@/components/ui/Button";
import { COPY } from "@/lib/copy";
import { createLabOrdersForStoreOrder } from "@/lib/lab-orders";
import { createOrderFromCart } from "@/lib/orders";
import { formatPaymentTotalForDisplay } from "@/lib/payment-intent-format";
import { requestPaymentIntent } from "@/lib/payment-intent";
import type { CartLineRow } from "@/lib/store";
import { paymentIntentIdFromClientSecret } from "@/lib/stripe-config";

type CheckoutPhase = "idle" | "starting" | "sheet" | "saving";

type StripePayButtonProps = {
  disabled: boolean;
  userId: string;
  lines: CartLineRow[];
  onError: (message: string) => void;
  onSuccess: (orderId: string) => void;
};

/**
 * Native only — opens Stripe Payment Sheet after create-payment-intent.
 * Parent must only render this when StripeProvider wraps the app.
 */
export function StripePayButton({
  disabled,
  userId,
  lines,
  onError,
  onSuccess,
}: StripePayButtonProps) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [phase, setPhase] = useState<CheckoutPhase>("idle");
  const cartItemIds = lines.map((line) => line.id);
  const busy = phase !== "idle";

  const pay = async () => {
    if (cartItemIds.length === 0) {
      onError(COPY.checkoutEmptyCart);
      return;
    }

    setPhase("starting");
    try {
      const intent = await requestPaymentIntent(cartItemIds);
      if (!intent.ok) {
        if (intent.message.toLowerCase().includes("stripe is not set up")) {
          onError(COPY.checkoutStripeSecretMissing);
        } else {
          onError(intent.message);
        }
        return;
      }

      const init = await initPaymentSheet({
        paymentIntentClientSecret: intent.clientSecret,
        merchantDisplayName: COPY.appName,
        allowsDelayedPaymentMethods: false,
      });
      if (init.error) {
        onError(init.error.message ?? COPY.checkoutSheetInitFailed);
        return;
      }

      setPhase("sheet");
      const presented = await presentPaymentSheet();
      if (presented.error) {
        if (presented.error.code === "Canceled") {
          onError(COPY.checkoutPaymentCancelled);
          return;
        }
        onError(presented.error.message ?? COPY.checkoutPaymentFailed);
        return;
      }

      setPhase("saving");
      const paymentRef =
        paymentIntentIdFromClientSecret(intent.clientSecret) ?? null;
      const orderResult = await createOrderFromCart({
        userId,
        lines,
        totalAmount: intent.total,
        currency: intent.currency,
        paymentRef,
        paymentProvider: "stripe",
      });
      if (!orderResult.ok) {
        onError(orderResult.message);
        return;
      }

      // Phase 4 Day 5 — queue lab fulfilment for test products (non-blocking).
      try {
        await createLabOrdersForStoreOrder(orderResult.orderId);
      } catch {
        // Store order is already saved; lab rows can be created via admin or RPC later.
      }

      onSuccess(orderResult.orderId);
    } catch {
      onError(COPY.checkoutPaymentFailed);
    } finally {
      setPhase("idle");
    }
  };

  const title =
    phase === "starting" || phase === "sheet"
      ? COPY.checkoutProcessing
      : phase === "saving"
        ? COPY.checkoutSavingOrder
        : COPY.checkoutPay;

  return (
    <>
      <Text className="mt-2 text-center text-sm text-charcoal">
        {COPY.cartTotalNote}
      </Text>
      <Button
        title={title}
        loading={busy}
        disabled={disabled || busy}
        onPress={() => {
          void pay();
        }}
      />
    </>
  );
}

/** For tests / display helpers without importing native Stripe. */
export function formatCheckoutServerHint(total: number, currency: string): string {
  return `Server total: ${formatPaymentTotalForDisplay(total, currency)}`;
}
