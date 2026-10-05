import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Platform, View } from "react-native";

import { StripePayButton } from "@/components/checkout/StripePayButton";
import { ClinicalTerm } from "@/components/ClinicalTerm";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { SkeletonCardList } from "@/components/ui/Skeleton";
import {
  BodySmall,
  BodyText,
  ErrorText,
  ScreenTitle,
} from "@/components/ui/Typography";
import { COPY } from "@/lib/copy";
import { colors } from "@/lib/design-tokens";
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
      <ScreenTitle centered>{COPY.checkoutTitle}</ScreenTitle>
      <BodyText className="mt-4" centered>{COPY.checkoutBody}</BodyText>

      {!stripeKeyReady ? (
        <BodySmall className="mt-4" centered style={{ color: colors.charcoal }}>
          {COPY.checkoutStripeKeyMissing}
        </BodySmall>
      ) : null}

      {!stripeNative && stripeKeyReady ? (
        <BodySmall className="mt-4" centered style={{ color: colors.charcoal }}>
          {COPY.checkoutWebUnsupported}
        </BodySmall>
      ) : null}

      {loadingCart ? <SkeletonCardList rows={3} /> : null}

      {cartMessage ? (
        <>
          <ErrorText className="mt-4" centered>{cartMessage}</ErrorText>
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
        <BodyText className="mt-6" centered>{COPY.checkoutEmptyCart}</BodyText>
      ) : null}

      {!loadingCart && !cartMessage
        ? purchasableLines.map((line) => {
            const lineTotal = line.product.price * line.quantity;
            return (
              <View key={line.id} className="mt-4 rounded-2xl bg-white px-4 py-4">
                <ClinicalTerm
                  plainName={line.product.plain_name}
                  plainExplanation={
                    line.product.plain_description?.trim() ||
                    "In your checkout."
                  }
                  medicalName={line.product.clinical_name}
                />
                <BodyText className="mt-2" style={{ color: colors.primaryBlue }}>
                  {formatProductPrice(line.product)} × {line.quantity} = ₹
                  {lineTotal.toLocaleString("en-IN")}
                </BodyText>
              </View>
            );
          })
        : null}

      {!loadingCart && !cartMessage && purchasableLines.length > 0 ? (
        <View className="mt-6 rounded-2xl border border-border bg-iceBlue px-4 py-4">
          <BodyText centered>{COPY.cartTotal}</BodyText>
          <ScreenTitle className="mt-2" centered style={{ color: colors.primaryBlue }}>
            ₹{displayTotal.toLocaleString("en-IN")}
          </ScreenTitle>
          <BodySmall className="mt-2" centered style={{ color: colors.charcoal }}>
            {COPY.cartTotalNote}
          </BodySmall>
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
          <ErrorText className="mt-4" centered>{errorMessage}</ErrorText>
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

      <BodySmall className="mt-4" centered style={{ color: colors.charcoal }}>
        {COPY.checkoutDay5Note}
      </BodySmall>

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
