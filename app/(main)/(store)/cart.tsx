import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PurchaseStatus } from "@/components/store/ProductCard";
import { IconButton, PrimaryButton, TextButton } from "@/components/ui/Button";
import { MossPattern } from "@/components/ui/MossPattern";
import { Screen } from "@/components/ui/Screen";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { Surface } from "@/components/ui/Surface";
import { TwoTone, type TwoTonePart } from "@/components/ui/TwoTone";
import { COPY } from "@/lib/copy";
import {
  colors,
  radius,
  spacing,
  status,
  tapTarget,
} from "@/lib/design-tokens";
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
import { loadUserContext } from "@/lib/user-context";
import { fontFamily, typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/** Failure text borrows the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

/** The one headline on the screen. Read the bold word and it still says it. */
const HEADLINE: TwoTonePart[] = [
  { text: "Your ", tone: "grey" },
  { text: "cart", tone: "bold" },
];

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
    <Screen scroll>
      <View style={styles.topRow}>
        <IconButton
          icon="arrow-left"
          accessibilityLabel={COPY.storeBackStore}
          onPress={() => {
            router.replace(routes.store);
          }}
          style={styles.back}
        />
      </View>

      <View accessibilityRole="header">
        <TwoTone size="xl" parts={HEADLINE} />
      </View>

      <Text style={styles.lede}>{COPY.cartBody}</Text>

      {loading ? <StaticSkeleton rows={3} /> : null}

      {message ? (
        <>
          <Text style={styles.error}>{message}</Text>
          <TextButton
            title={COPY.storeRetry}
            onPress={() => {
              refresh();
            }}
          />
        </>
      ) : null}

      {actionMessage ? <Text style={styles.ok}>{actionMessage}</Text> : null}

      {!loading && !message && lines.length === 0 ? (
        /*
          The one empty state in the app that does not go through
          `EmptyState`: it carries a single line rather than a heading and an
          explanation. Same treatment though — a clipped band of the motif.
        */
        <Surface padded={false} style={styles.empty}>
          <MossPattern height={96} />
          <Text style={styles.emptyText}>{COPY.cartEmpty}</Text>
        </Surface>
      ) : null}

      {!loading && !message
        ? lines.map(({ line, gate }) => {
            const busy = updatingId === line.id;
            const lineTotal = line.product.price * line.quantity;
            return (
              <Surface key={line.id} style={styles.line}>
                <Text style={styles.lineName}>{line.product.plain_name}</Text>
                <Text style={styles.lineMaths}>
                  {formatProductPrice(line.product)} × {line.quantity} = ₹
                  {lineTotal.toLocaleString("en-IN")}
                </Text>

                <PurchaseStatus gate={gate} />

                <View style={styles.lineControls}>
                  {/* 44pt round steps, the one place the pill radius is a
                      control rather than a chip. */}
                  <View style={styles.stepper}>
                    <StepButton
                      glyph="−"
                      label={COPY.cartDecrease}
                      disabled={busy}
                      onPress={() => {
                        void changeQuantity(line, -1);
                      }}
                    />
                    <Text
                      style={styles.quantity}
                      accessibilityLabel={`${COPY.cartQuantity}: ${line.quantity}`}
                    >
                      {line.quantity}
                    </Text>
                    <StepButton
                      glyph="+"
                      label={COPY.cartIncrease}
                      disabled={busy}
                      onPress={() => {
                        void changeQuantity(line, 1);
                      }}
                    />
                  </View>

                  <TextButton
                    title={COPY.cartRemove}
                    disabled={busy}
                    style={styles.remove}
                    onPress={() => {
                      void removeLine(line);
                    }}
                  />
                </View>
              </Surface>
            );
          })
        : null}

      {!loading && !message && lines.length > 0 ? (
        <Surface style={styles.totalCard}>
          <Text style={styles.eyebrow}>{COPY.cartTotal}</Text>
          <Text style={styles.total}>₹{total.toLocaleString("en-IN")}</Text>
          <Text style={styles.totalNote}>{COPY.cartTotalNote}</Text>
        </Surface>
      ) : null}

      {/* The one black button on this screen. */}
      <PrimaryButton
        title={COPY.cartCheckout}
        disabled={!canCheckout}
        onPress={() => {
          router.push(routes.storeCheckout);
        }}
      />
    </Screen>
  );
}

/** One round step. 44 in both dimensions, paper fill, no border. */
function StepButton({
  glyph,
  label,
  disabled,
  onPress,
}: {
  glyph: string;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.step,
        disabled ? styles.stepDisabled : null,
        pressed && !disabled ? styles.stepPressed : null,
      ]}
    >
      <Text style={[styles.stepGlyph, disabled ? styles.stepOff : null]}>
        {glyph}
      </Text>
    </Pressable>
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
  empty: {
    marginTop: spacing.md,
    overflow: "hidden",
  },
  emptyText: {
    paddingHorizontal: 20,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.inkSoft,
    textAlign: "center",
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
  lineControls: {
    marginTop: spacing.base,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.mdSm,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  step: {
    width: tapTarget,
    height: tapTarget,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  stepPressed: {
    backgroundColor: colors.hairline,
  },
  stepGlyph: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 20,
    lineHeight: 24,
    color: colors.ink,
  },
  // Disabled is `hairline` on `inkMuted` — the one disabled pair the system
  // defines, the same one the buttons use.
  stepDisabled: {
    backgroundColor: colors.hairline,
  },
  stepOff: {
    color: colors.inkMuted,
  },
  quantity: {
    minWidth: 20,
    textAlign: "center",
    fontFamily: fontFamily.bodySemi,
    fontSize: 17,
    lineHeight: 22,
    color: colors.ink,
  },
  remove: {
    marginTop: 0,
    flexShrink: 1,
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
  ok: {
    marginTop: spacing.sm,
    ...typography.label,
    color: colors.mossDeep,
  },
});
