import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { StripePayButton } from "@/components/checkout/StripePayButton";
import { IconButton, PrimaryButton, TextButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { Surface } from "@/components/ui/Surface";
import { TwoTone } from "@/components/ui/TwoTone";
import { COPY } from "@/lib/copy";
import { colors, spacing, status } from "@/lib/design-tokens";
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
import { fontFamily, typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/** Failure text borrows the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

/**
 * The running total, at the detail board's 28 with tracking at -3% of the
 * size. A price rather than a headline, so plain `Text` and not `TwoTone`.
 */
const TOTAL = {
  fontFamily: fontFamily.display,
  fontSize: 28,
  lineHeight: 28,
  // 28 x -0.03
  letterSpacing: -0.8,
} as const;

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
      <View style={styles.topRow}>
        <IconButton
          icon="arrow-left"
          accessibilityLabel={COPY.storeBackCart}
          onPress={() => {
            router.replace(routes.storeCart);
          }}
          style={styles.back}
        />
      </View>

      <View accessibilityRole="header">
        <TwoTone size="xl" parts={[{ text: COPY.checkoutTitle, tone: "bold" }]} />
      </View>

      {/* What the server charges and what this screen is not. Never trimmed. */}
      <Text style={styles.lede}>{COPY.checkoutBody}</Text>

      {!stripeKeyReady ? (
        <Text style={styles.note}>{COPY.checkoutStripeKeyMissing}</Text>
      ) : null}

      {!stripeNative && stripeKeyReady ? (
        <Text style={styles.note}>{COPY.checkoutWebUnsupported}</Text>
      ) : null}

      {loadingCart ? <StaticSkeleton rows={3} /> : null}

      {cartMessage ? (
        <>
          <Text style={styles.error}>{cartMessage}</Text>
          <TextButton
            title={COPY.storeRetry}
            onPress={() => {
              loadCheckoutCart();
            }}
          />
        </>
      ) : null}

      {!loadingCart && !cartMessage && purchasableLines.length === 0 ? (
        <Text style={styles.note}>{COPY.checkoutEmptyCart}</Text>
      ) : null}

      {!loadingCart && !cartMessage
        ? purchasableLines.map((line) => {
            const lineTotal = line.product.price * line.quantity;
            return (
              <Surface key={line.id} style={styles.line}>
                <Text style={styles.lineName}>{line.product.plain_name}</Text>
                <Text style={styles.lineMaths}>
                  {formatProductPrice(line.product)} × {line.quantity} = ₹
                  {lineTotal.toLocaleString("en-IN")}
                </Text>
              </Surface>
            );
          })
        : null}

      {!loadingCart && !cartMessage && purchasableLines.length > 0 ? (
        <Surface style={styles.totalCard}>
          <Text style={styles.eyebrow}>{COPY.cartTotal}</Text>
          <Text style={styles.total}>
            ₹{displayTotal.toLocaleString("en-IN")}
          </Text>
          <Text style={styles.totalNote}>{COPY.cartTotalNote}</Text>
        </Surface>
      ) : null}

      {/* The one black button on this screen, whichever branch renders it. */}
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
          <Text style={styles.error}>{errorMessage}</Text>
          {canUsePaymentSheet && canPay ? (
            <TextButton
              title={COPY.checkoutRetryPay}
              onPress={() => {
                setErrorMessage(null);
              }}
            />
          ) : null}
        </>
      ) : null}

      <Text style={styles.note}>{COPY.checkoutDay5Note}</Text>

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
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  back: {
    // Pulled into the gutter so the glyph, not its 44pt hit area, lines up
    // with the headline under it.
    marginLeft: -12,
  },
  lede: {
    marginTop: spacing.mdSm,
    ...typography.body,
    color: colors.inkSoft,
  },
  note: {
    marginTop: spacing.base,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkSoft,
  },
  line: {
    marginTop: spacing.base,
  },
  lineName: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
  },
  lineMaths: {
    marginTop: 3,
    ...typography.label,
    color: colors.inkSoft,
  },
  totalCard: {
    marginTop: spacing.md,
  },
  eyebrow: {
    ...typography.micro,
    color: colors.inkMuted,
  },
  total: {
    marginTop: spacing.micro,
    ...TOTAL,
    color: colors.ink,
  },
  totalNote: {
    marginTop: spacing.sm,
    ...typography.label,
    color: colors.inkSoft,
  },
  error: {
    marginTop: spacing.mdSm,
    ...typography.label,
    color: CLAY,
  },
});
