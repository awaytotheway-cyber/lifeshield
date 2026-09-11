import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { ClinicalTerm } from "@/components/ClinicalTerm";
import { PurchaseStatus } from "@/components/store/ProductCard";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
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
    <Screen scroll>
      <Text className="text-center text-2xl text-charcoal">{COPY.cartTitle}</Text>
      <Text className="mt-3 text-center text-charcoal">{COPY.cartBody}</Text>

      {loading ? <ActivityIndicator className="mt-6" color="#1A535C" /> : null}

      {message ? (
        <>
          <Text className="mt-4 text-center text-coral">{message}</Text>
          <Button
            title={COPY.storeRetry}
            variant="ghost"
            onPress={() => {
              refresh();
            }}
          />
        </>
      ) : null}

      {actionMessage ? (
        <Text className="mt-4 text-center text-teal">{actionMessage}</Text>
      ) : null}

      {!loading && !message && lines.length === 0 ? (
        <Text className="mt-6 text-center text-charcoal">{COPY.cartEmpty}</Text>
      ) : null}

      {!loading && !message
        ? lines.map(({ line, gate }) => {
            const busy = updatingId === line.id;
            const lineTotal = line.product.price * line.quantity;
            return (
              <View key={line.id} className="mt-4 rounded-xl bg-white px-4 py-4">
                <ClinicalTerm
                  plainName={line.product.plain_name}
                  plainExplanation={
                    line.product.plain_description?.trim() ||
                    "Saved in your cart."
                  }
                  medicalName={line.product.clinical_name}
                />
                <Text className="mt-2 text-teal">
                  {formatProductPrice(line.product)} × {line.quantity} = ₹
                  {lineTotal.toLocaleString("en-IN")}
                </Text>
                <PurchaseStatus gate={gate} />

                <View className="mt-3 flex-row items-center justify-center">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={COPY.cartDecrease}
                    disabled={busy}
                    className="rounded-lg bg-cream px-4 py-2"
                    onPress={() => {
                      void changeQuantity(line, -1);
                    }}
                  >
                    <Text className="text-xl text-charcoal">−</Text>
                  </Pressable>
                  <Text className="mx-4 text-charcoal">
                    {COPY.cartQuantity}: {line.quantity}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={COPY.cartIncrease}
                    disabled={busy}
                    className="rounded-lg bg-cream px-4 py-2"
                    onPress={() => {
                      void changeQuantity(line, 1);
                    }}
                  >
                    <Text className="text-xl text-charcoal">+</Text>
                  </Pressable>
                </View>

                <Button
                  title={COPY.cartRemove}
                  variant="ghost"
                  disabled={busy}
                  onPress={() => {
                    void removeLine(line);
                  }}
                />
              </View>
            );
          })
        : null}

      {!loading && !message && lines.length > 0 ? (
        <View className="mt-6 rounded-xl border border-teal bg-white px-4 py-4">
          <Text className="text-center text-charcoal">{COPY.cartTotal}</Text>
          <Text className="mt-2 text-center text-2xl text-teal">
            ₹{total.toLocaleString("en-IN")}
          </Text>
          <Text className="mt-2 text-center text-sm text-charcoal">
            {COPY.cartTotalNote}
          </Text>
        </View>
      ) : null}

      <Button
        title={COPY.cartCheckout}
        disabled={!canCheckout}
        onPress={() => {
          router.push(routes.storeCheckout);
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
