import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { COPY } from "@/lib/copy";
import {
  formatOrderStatus,
  loadOrderDetail,
  loadOwnOrders,
  type StoreOrderItemRow,
  type StoreOrderRow,
} from "@/lib/orders";
import { formatPaymentTotalForDisplay } from "@/lib/payment-intent-format";
import { orderDetailHref, routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

function OrderListCard({
  order,
  onPress,
}: {
  order: StoreOrderRow;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mt-3 rounded-xl bg-white px-4 py-4 active:opacity-80"
    >
      <Text className="text-charcoal">
        {formatPaymentTotalForDisplay(order.total_amount, order.currency)}
      </Text>
      <Text className="mt-1 text-teal">{formatOrderStatus(order)}</Text>
      <Text className="mt-1 text-xs text-charcoal">
        {order.created_at
          ? new Date(order.created_at).toLocaleDateString()
          : ""}
      </Text>
    </Pressable>
  );
}

/**
 * Order list + post-checkout success banner.
 * Status comes from Supabase; Stripe webhook (Day 6) reconciles payment server-side.
 */
export default function OrdersScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const params = useLocalSearchParams<{ placed?: string; orderId?: string }>();
  const placed = params.placed === "1";
  const highlightOrderId =
    typeof params.orderId === "string" ? params.orderId : undefined;

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [orders, setOrders] = useState<StoreOrderRow[]>([]);
  const [highlightItems, setHighlightItems] = useState<StoreOrderItemRow[]>([]);
  const [highlightOrder, setHighlightOrder] = useState<StoreOrderRow | null>(
    null,
  );

  const refresh = useCallback(() => {
    const userId = session?.user.id;
    if (!userId) {
      return () => {};
    }
    let cancelled = false;
    setLoading(true);
    setMessage(null);
    void (async () => {
      try {
        const listResult = await loadOwnOrders(userId);
        if (cancelled) {
          return;
        }
        if (!listResult.ok) {
          setMessage(listResult.message);
          setOrders([]);
          return;
        }
        setOrders(listResult.orders);

        if (highlightOrderId) {
          const detail = await loadOrderDetail(userId, highlightOrderId);
          if (!cancelled && detail.ok) {
            setHighlightOrder(detail.order);
            setHighlightItems(detail.items);
          }
        }
      } catch {
        if (!cancelled) {
          setMessage(COPY.ordersLoadFailed);
          setOrders([]);
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
  }, [session?.user.id, highlightOrderId]);

  useFocusEffect(refresh);

  const showHighlight = useMemo(() => {
    if (highlightOrder) {
      return highlightOrder;
    }
    if (highlightOrderId) {
      return orders.find((order) => order.id === highlightOrderId) ?? null;
    }
    return null;
  }, [highlightOrder, highlightOrderId, orders]);

  const openOrder = (orderId: string) => {
    router.push(orderDetailHref(orderId));
  };

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
      <Text className="text-center text-2xl text-charcoal">
        {placed ? COPY.checkoutSuccessTitle : COPY.ordersTitle}
      </Text>

      {placed ? (
        <Text className="mt-4 text-center text-teal">{COPY.ordersPlacedBanner}</Text>
      ) : (
        <Text className="mt-4 text-center text-charcoal">{COPY.ordersBody}</Text>
      )}

      {placed ? (
        <Text className="mt-2 text-center text-sm text-charcoal">
          {COPY.checkoutSuccessBody}
        </Text>
      ) : (
        <Text className="mt-2 text-center text-xs text-charcoal">
          {COPY.ordersWebhookNote}
        </Text>
      )}

      {loading ? <ActivityIndicator className="mt-6" color="#FF6000" /> : null}

      {message ? (
        <>
          <Text className="mt-4 text-center text-coral">{message}</Text>
          <Button title={COPY.storeRetry} variant="ghost" onPress={refresh} />
        </>
      ) : null}

      {showHighlight ? (
        <Pressable
          onPress={() => {
            openOrder(showHighlight.id);
          }}
          className="mt-6 rounded-xl border border-teal bg-white px-4 py-4 active:opacity-80"
        >
          <Text className="text-center text-lg text-charcoal">
            {formatPaymentTotalForDisplay(
              showHighlight.total_amount,
              showHighlight.currency,
            )}
          </Text>
          <Text className="mt-2 text-center text-teal">
            {formatOrderStatus(showHighlight, highlightItems)}
          </Text>

          {highlightItems.length > 0 ? (
            <View className="mt-4">
              <Text className="text-center text-sm text-charcoal">
                {COPY.orderItemsLabel}
              </Text>
              {highlightItems.map((item) => (
                <Text
                  key={item.id}
                  className="mt-2 text-center text-sm text-charcoal"
                >
                  {item.product_name} × {item.quantity} — ₹
                  {(item.unit_price * item.quantity).toLocaleString("en-IN")}
                </Text>
              ))}
            </View>
          ) : null}

          <Text className="mt-4 text-center text-sm text-coral">
            {COPY.checkoutViewOrder}
          </Text>
        </Pressable>
      ) : null}

      {!loading && !message && !placed && orders.length === 0 ? (
        <Text className="mt-6 text-center text-charcoal">{COPY.ordersEmpty}</Text>
      ) : null}

      {!loading && !message && orders.length > 0 && !placed ? (
        <Text className="mt-6 text-center text-sm text-charcoal">
          {COPY.ordersTapForDetail}
        </Text>
      ) : null}

      {!loading && !message && orders.length > 0 ? (
        <View className="mt-4">
          {orders
            .filter((order) => !placed || order.id !== highlightOrderId)
            .map((order) => (
              <OrderListCard
                key={order.id}
                order={order}
                onPress={() => {
                  openOrder(order.id);
                }}
              />
            ))}
        </View>
      ) : null}

      <Button
        title={COPY.orderBackStore}
        onPress={() => {
          router.replace(routes.store);
        }}
      />
      <Button
        title={COPY.orderBackHome}
        variant="ghost"
        onPress={() => {
          router.replace(routes.home);
        }}
      />
    </Screen>
  );
}
