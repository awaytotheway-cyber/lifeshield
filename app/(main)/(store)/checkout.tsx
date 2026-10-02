import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { StripePayButton } from "@/components/checkout/StripePayButton";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
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
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
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
      <ScreenHeader
        title={COPY.checkoutTitle}
        subtitle={COPY.checkoutBody}
        onBack={() => router.replace(routes.storeCart)}
        backLabel={COPY.storeBackCart}
      />

      {!stripeKeyReady ? (
        <View style={styles.noticeWrap}>
          <Card>
            <Text style={styles.notice}>{COPY.checkoutStripeKeyMissing}</Text>
          </Card>
        </View>
      ) : null}

      {!stripeNative && stripeKeyReady ? (
        <View style={styles.noticeWrap}>
          <Card>
            <Text style={styles.notice}>{COPY.checkoutWebUnsupported}</Text>
          </Card>
        </View>
      ) : null}

      {loadingCart ? <StaticSkeleton rows={2} /> : null}

      {cartMessage ? (
        <Card>
          <Text style={styles.error}>{cartMessage}</Text>
          <TextButton
            title={COPY.storeRetry}
            onPress={() => {
              loadCheckoutCart();
            }}
          />
        </Card>
      ) : null}

      {!loadingCart && !cartMessage && purchasableLines.length === 0 ? (
        <Card>
          <Text style={styles.body}>{COPY.checkoutEmptyCart}</Text>
        </Card>
      ) : null}

      {!loadingCart && !cartMessage && purchasableLines.length > 0 ? (
        <>
          {/* No top gap when nothing sits between this and the header. */}
          <SectionTitle
            title={COPY.orderItemsLabel}
            first={stripeKeyReady && stripeNative}
          />
          <View style={styles.stack}>
            {purchasableLines.map((line) => {
              const lineTotal = line.product.price * line.quantity;
              return (
                <Card key={line.id}>
                  <Text style={styles.lineName}>{line.product.plain_name}</Text>
                  <Text style={styles.lineClinical}>
                    {line.product.clinical_name}
                  </Text>
                  <View style={styles.lineFoot}>
                    <Text style={styles.unitPrice}>
                      {formatProductPrice(line.product)} × {line.quantity}
                    </Text>
                    <Text style={styles.lineTotal}>
                      ₹{lineTotal.toLocaleString("en-IN")}
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>

          <View style={styles.totalWrap}>
            <Card>
              <Text style={styles.totalLabel}>{COPY.cartTotal}</Text>
              <Text style={styles.totalValue}>
                ₹{displayTotal.toLocaleString("en-IN")}
              </Text>
              <Text style={styles.totalNote}>{COPY.cartTotalNote}</Text>
            </Card>
          </View>
        </>
      ) : null}

      <View style={styles.payWrap}>
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
          <PrimaryButton
            title={COPY.checkoutPay}
            icon="lock"
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
      </View>

      {errorMessage ? (
        <Card>
          <Text style={styles.error}>{errorMessage}</Text>
          {canUsePaymentSheet && canPay ? (
            <TextButton
              title={COPY.checkoutRetryPay}
              onPress={() => {
                setErrorMessage(null);
              }}
            />
          ) : null}
        </Card>
      ) : null}

      <Text style={styles.footnote}>{COPY.checkoutDay5Note}</Text>

      <TextButton
        title={COPY.storeBackStore}
        onPress={() => {
          router.replace(routes.store);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  noticeWrap: {
    marginBottom: Gap.cards,
  },
  notice: {
    ...typeStyle("secondary"),
    color: Colors.body,
  },
  body: {
    ...typeStyle("body"),
    color: Colors.body,
  },
  error: {
    ...typeStyle("body"),
    color: Colors.red,
  },
  stack: {
    gap: Gap.cards,
  },
  lineName: {
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  lineClinical: {
    marginTop: 2,
    ...typeStyle("caption"),
    color: Colors.muted,
  },
  lineFoot: {
    marginTop: Space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.sm,
  },
  unitPrice: {
    ...typeStyle("secondary"),
    color: Colors.muted,
  },
  lineTotal: {
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  totalWrap: {
    marginTop: Gap.sections,
  },
  totalLabel: {
    ...typeStyle("label"),
    color: Colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  totalValue: {
    marginTop: Space.sm,
    ...typeStyle("dataBig"),
    color: Colors.orange,
  },
  totalNote: {
    marginTop: Space.sm,
    ...typeStyle("secondary"),
    color: Colors.muted,
  },
  payWrap: {
    marginTop: Gap.beforeFooter - Space.md,
  },
  footnote: {
    marginTop: Space.lg,
    ...typeStyle("caption"),
    color: Colors.muted,
    textAlign: "center",
  },
});
