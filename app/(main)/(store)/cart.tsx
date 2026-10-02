import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { EmptyBox } from "@/components/illustrations";
import { PurchaseStatus } from "@/components/store/ProductCard";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PressScale } from "@/components/ui/PressScale";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import { canPurchase, type PurchaseGateResult } from "@/lib/purchase-gates";
import { routes } from "@/lib/routes";
import {
  cartDisplayTotal,
  formatProductPrice,
  loadOwnCart,
  removeCartItem,
  setCartQuantity,
  type CartLineRow,
} from "@/lib/store";
import { Colors, Gap, Motion, Radius, Size, Space, typeStyle } from "@/lib/theme";
import { loadUserContext } from "@/lib/user-context";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

type CheckedLine = {
  line: CartLineRow;
  gate: PurchaseGateResult;
};

/**
 * Cart — checkpoint 2 of 3 for canPurchase() (re-check on every load).
 * Hard-blocked items are removed; interaction-flag items stay with amber state.
 */
export default function CartScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [lines, setLines] = useState<CheckedLine[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const userId = session?.user.id;
    if (!userId) {
      return () => {};
    }
    let cancelled = false;
    setLoading(true);
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
          setMessage(cart.message);
          setLines([]);
          return;
        }
        if (!contextResult.ok) {
          setMessage(contextResult.message);
          setLines([]);
          return;
        }
        setMessage(null);
        const checked: CheckedLine[] = cart.lines.map((line) => ({
          line,
          gate: canPurchase(line.product, contextResult.context),
        }));
        setLines(checked);

        // Drop items that are now hard-blocked (consent, iodine, draft plan).
        const blocked = checked.filter(
          (item) => !item.gate.allowed && !item.gate.needsCheck,
        );
        for (const item of blocked) {
          try {
            await removeCartItem(userId, item.line.id);
          } catch {
            // Keep showing the row with the block message if delete fails.
          }
        }
        if (blocked.length > 0) {
          const reload = await loadOwnCart(userId);
          if (reload.ok) {
            setLines(
              reload.lines.map((line) => ({
                line,
                gate: canPurchase(line.product, contextResult.context),
              })),
            );
            setActionMessage(COPY.cartRemovedBlocked);
          }
        }
      } catch {
        if (!cancelled) {
          setMessage(COPY.cartLoadFailed);
          setLines([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  useFocusEffect(refresh);

  const purchasableLines = useMemo(
    () => lines.filter((item) => item.gate.allowed && !item.gate.needsCheck),
    [lines],
  );

  const total = useMemo(
    () => cartDisplayTotal(purchasableLines.map((item) => item.line)),
    [purchasableLines],
  );

  const changeQuantity = async (line: CartLineRow, delta: number) => {
    if (!session?.user.id) {
      return;
    }
    const next = line.quantity + delta;
    setActionMessage(null);
    setUpdatingId(line.id);
    try {
      const result = await setCartQuantity(session.user.id, line.id, next);
      if (!result.ok) {
        setActionMessage(result.message);
        return;
      }
      refresh();
    } catch {
      setActionMessage(COPY.cartUpdateFailed);
    } finally {
      setUpdatingId(null);
    }
  };

  const removeLine = async (line: CartLineRow) => {
    if (!session?.user.id) {
      return;
    }
    setActionMessage(null);
    setUpdatingId(line.id);
    try {
      const result = await removeCartItem(session.user.id, line.id);
      if (!result.ok) {
        setActionMessage(result.message);
        return;
      }
      refresh();
    } catch {
      setActionMessage(COPY.cartUpdateFailed);
    } finally {
      setUpdatingId(null);
    }
  };

  const canCheckout = purchasableLines.length > 0;

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
    <Screen
      scroll
      footer={
        <PrimaryButton
          title={COPY.cartCheckout}
          disabled={!canCheckout}
          onPress={() => {
            router.push(routes.storeCheckout);
          }}
        />
      }
    >
      <ScreenHeader
        title={COPY.cartTitle}
        subtitle={COPY.cartBody}
        onBack={() => router.replace(routes.store)}
        backLabel={COPY.storeBackStore}
      />

      {loading ? <StaticSkeleton rows={2} /> : null}

      {message ? (
        <Card>
          <Text style={styles.error}>{message}</Text>
          <TextButton
            title={COPY.storeRetry}
            onPress={() => {
              refresh();
            }}
          />
        </Card>
      ) : null}

      {actionMessage ? <Text style={styles.ok}>{actionMessage}</Text> : null}

      {!loading && !message && lines.length === 0 ? (
        <Card>
          <View style={styles.emptyWrap}>
            <EmptyBox width={120} height={120} />
            <Text style={styles.emptyBody}>{COPY.cartEmpty}</Text>
          </View>
        </Card>
      ) : null}

      {!loading && !message && lines.length > 0 ? (
        <View style={styles.stack}>
          {lines.map(({ line, gate }) => {
            const busy = updatingId === line.id;
            const lineTotal = line.product.price * line.quantity;
            return (
              <Card key={line.id}>
                <View style={styles.lineHead}>
                  <View style={styles.lineText}>
                    <Text style={styles.lineName}>
                      {line.product.plain_name}
                    </Text>
                    <Text style={styles.lineClinical}>
                      {line.product.clinical_name}
                    </Text>
                  </View>
                  <PressScale
                    accessibilityRole="button"
                    accessibilityLabel={COPY.cartRemove}
                    disabled={busy}
                    haptic="light"
                    scale={Motion.pressCard}
                    onPress={() => {
                      void removeLine(line);
                    }}
                    style={({ pressed }) => [
                      styles.removeHit,
                      pressed ? styles.stepperPressed : null,
                      busy ? styles.busy : null,
                    ]}
                  >
                    <Feather name="trash-2" size={18} color={Colors.muted} />
                  </PressScale>
                </View>

                <PurchaseStatus gate={gate} />

                <View style={styles.divider} />

                <View style={styles.lineFoot}>
                  <View style={styles.stepper}>
                    <PressScale
                      accessibilityRole="button"
                      accessibilityLabel={COPY.cartDecrease}
                      disabled={busy}
                      haptic="light"
                      scale={Motion.pressButton}
                      onPress={() => {
                        void changeQuantity(line, -1);
                      }}
                      style={({ pressed }) => [
                        styles.stepperBtn,
                        pressed ? styles.stepperPressed : null,
                        busy ? styles.busy : null,
                      ]}
                    >
                      <Feather name="minus" size={18} color={Colors.ink} />
                    </PressScale>
                    <Text style={styles.qty}>
                      {COPY.cartQuantity} {line.quantity}
                    </Text>
                    <PressScale
                      accessibilityRole="button"
                      accessibilityLabel={COPY.cartIncrease}
                      disabled={busy}
                      haptic="light"
                      scale={Motion.pressButton}
                      onPress={() => {
                        void changeQuantity(line, 1);
                      }}
                      style={({ pressed }) => [
                        styles.stepperBtn,
                        pressed ? styles.stepperPressed : null,
                        busy ? styles.busy : null,
                      ]}
                    >
                      <Feather name="plus" size={18} color={Colors.ink} />
                    </PressScale>
                  </View>

                  <View style={styles.lineTotals}>
                    <Text style={styles.unitPrice}>
                      {formatProductPrice(line.product)} each
                    </Text>
                    <Text style={styles.lineTotal}>
                      ₹{lineTotal.toLocaleString("en-IN")}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      ) : null}

      {!loading && !message && lines.length > 0 ? (
        <View style={styles.totalWrap}>
          <Card>
            <Text style={styles.totalLabel}>{COPY.cartTotal}</Text>
            <Text style={styles.totalValue}>
              ₹{total.toLocaleString("en-IN")}
            </Text>
            <Text style={styles.totalNote}>{COPY.cartTotalNote}</Text>
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    ...typeStyle("body"),
    color: Colors.red,
  },
  ok: {
    marginBottom: Space.md,
    ...typeStyle("secondary"),
    color: Colors.green,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: Space.sm,
  },
  emptyBody: {
    marginTop: Space.lg,
    ...typeStyle("body"),
    color: Colors.body,
    textAlign: "center",
  },
  stack: {
    gap: Gap.cards,
  },
  lineHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Space.sm,
  },
  lineText: {
    flex: 1,
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
  removeHit: {
    width: Size.tap,
    height: Size.tap,
    borderRadius: Size.tap / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    marginVertical: Space.md,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.line,
  },
  lineFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.md,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  stepperBtn: {
    width: Size.tap,
    height: Size.tap,
    borderRadius: Radius.chip,
    backgroundColor: Colors.cloud,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperPressed: {
    backgroundColor: Colors.orangeTint,
  },
  busy: {
    opacity: 0.5,
  },
  qty: {
    minWidth: 52,
    textAlign: "center",
    ...typeStyle("label"),
    color: Colors.body,
  },
  lineTotals: {
    alignItems: "flex-end",
  },
  unitPrice: {
    ...typeStyle("caption"),
    color: Colors.muted,
  },
  lineTotal: {
    marginTop: 2,
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
});
