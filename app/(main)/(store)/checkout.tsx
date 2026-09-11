import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";

import { ClinicalTerm } from "@/components/ClinicalTerm";
import { StripePayButton } from "@/components/checkout/StripePayButton";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { COPY } from "@/lib/copy";
import { canPurchase } from "@/lib/purchase-gates";
import { orderPlacedHref, routes } from "@/lib/routes";
import {
  cartDisplayTotal,
  formatProductPrice,
  loadOwnCart,
  type CartLineRow,
} from "@/lib/store";
import { isStripePublishableKeyConfigured } from "@/lib/stripe-config";
import { loadUserContext } from "@/lib/user-context";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/**
 * Checkout — checkpoint 3 of 3 for canPurchase() (before Payment Sheet).
 * Only lines that pass all gates are charged; cart is preserved on failure.
 */
export default function CheckoutScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const [loadingCart, setLoadingCart] = useState(true);
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const [purchasableLines, setPurchasableLines] = useState<CartLineRow[]>([]);
  const [displayTotal, setDisplayTotal] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stripeKeyReady = isStripePublishableKeyConfigured();
  const stripeNative =
    Platform.OS === "ios" || Platform.OS === "android";
  const canUsePaymentSheet = stripeKeyReady && stripeNative;

  const loadCheckoutCart = useCallback(() => {
    const userId = session?.user.id;
    if (!userId) {
      return () => {};
    }
    let cancelled = false;
    setLoadingCart(true);
    setErrorMessage(null);
    void (async () => {
      try {
        const [cart, contextResult] = await Promise.all([
          loadOwnCart(userId),
          loadUserContext(userId),
        ]);
        if (cancelled) {
          return;
        }
        if (!cart.ok) {
          setCartMessage(cart.message);
          setPurchasableLines([]);
          setDisplayTotal(0);
          return;
        }
        if (!contextResult.ok) {
          setCartMessage(contextResult.message);
          setPurchasableLines([]);
          setDisplayTotal(0);
          return;
        }
        const purchasable = cart.lines.filter((line) => {
          const gate = canPurchase(line.product, contextResult.context);
          return gate.allowed && !gate.needsCheck;
        });
        setCartMessage(null);
        setPurchasableLines(purchasable);
        setDisplayTotal(cartDisplayTotal(purchasable));
      } catch {
        if (!cancelled) {
          setCartMessage(COPY.cartLoadFailed);
          setPurchasableLines([]);
          setDisplayTotal(0);
        }
      } finally {
        if (!cancelled) {
          setLoadingCart(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  useFocusEffect(loadCheckoutCart);

  const canPay =
    purchasableLines.length > 0 && !loadingCart && !cartMessage;

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  return (
    <Screen scroll>
      <Text className="text-center text-2xl text-charcoal">{COPY.checkoutTitle}</Text>
      <Text className="mt-4 text-center text-charcoal">{COPY.checkoutBody}</Text>

      {!stripeKeyReady ? (
        <Text className="mt-4 text-center text-sm text-charcoal">
          {COPY.checkoutStripeKeyMissing}
        </Text>
      ) : null}

      {!stripeNative && stripeKeyReady ? (
        <Text className="mt-4 text-center text-sm text-charcoal">
          {COPY.checkoutWebUnsupported}
        </Text>
      ) : null}

      {loadingCart ? <ActivityIndicator className="mt-6" color="#1A535C" /> : null}

      {cartMessage ? (
        <>
          <Text className="mt-4 text-center text-coral">{cartMessage}</Text>
          <Button
            title={COPY.storeRetry}
            variant="ghost"
            onPress={() => {
              loadCheckoutCart();
            }}
          />
        </>
      ) : null}

      {!loadingCart && !cartMessage && purchasableLines.length === 0 ? (
        <Text className="mt-6 text-center text-charcoal">{COPY.checkoutEmptyCart}</Text>
      ) : null}

      {!loadingCart && !cartMessage
        ? purchasableLines.map((line) => {
            const lineTotal = line.product.price * line.quantity;
            return (
              <View key={line.id} className="mt-4 rounded-xl bg-white px-4 py-4">
                <ClinicalTerm
                  plainName={line.product.plain_name}
                  plainExplanation={
                    line.product.plain_description?.trim() ||
                    "In your checkout."
                  }
                  medicalName={line.product.clinical_name}
                />
                <Text className="mt-2 text-teal">
                  {formatProductPrice(line.product)} × {line.quantity} = ₹
                  {lineTotal.toLocaleString("en-IN")}
                </Text>
              </View>
            );
          })
        : null}

      {!loadingCart && !cartMessage && purchasableLines.length > 0 ? (
        <View className="mt-6 rounded-xl border border-teal bg-white px-4 py-4">
          <Text className="text-center text-charcoal">{COPY.cartTotal}</Text>
          <Text className="mt-2 text-center text-2xl text-teal">
            ₹{displayTotal.toLocaleString("en-IN")}
          </Text>
          <Text className="mt-2 text-center text-sm text-charcoal">
            {COPY.cartTotalNote}
          </Text>
        </View>
      ) : null}

      {canUsePaymentSheet && session.user.id ? (
        <StripePayButton
          disabled={!canPay}
          userId={session.user.id}
          lines={purchasableLines}
          onError={(message) => {
            setErrorMessage(message);
          }}
          onSuccess={(orderId) => {
            router.replace(orderPlacedHref(orderId));
          }}
        />
      ) : (
        <Button
          title={COPY.checkoutPay}
          disabled={!canPay || !stripeKeyReady}
          onPress={() => {
            if (!stripeKeyReady) {
              setErrorMessage(COPY.checkoutStripeKeyMissing);
              return;
            }
            if (!stripeNative) {
              setErrorMessage(COPY.checkoutWebUnsupported);
            }
          }}
        />
      )}

      {errorMessage ? (
        <>
          <Text className="mt-4 text-center text-coral">{errorMessage}</Text>
          {canUsePaymentSheet && canPay ? (
            <Button
              title={COPY.checkoutRetryPay}
              variant="ghost"
              onPress={() => {
                setErrorMessage(null);
              }}
            />
          ) : null}
        </>
      ) : null}

      <Text className="mt-4 text-center text-sm text-charcoal">
        {COPY.checkoutDay5Note}
      </Text>

      <Button
        title={COPY.storeBackCart}
        variant="ghost"
        onPress={() => {
          router.replace(routes.storeCart);
        }}
      />
      <Button
        title={COPY.storeBackStore}
        variant="ghost"
        onPress={() => {
          router.replace(routes.store);
        }}
      />
    </Screen>
  );
}
