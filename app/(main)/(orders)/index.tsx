import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { SkeletonCardList } from "@/components/ui/Skeleton";
import {
  BodySmall,
  BodyText,
  Caption,
  CardTitle,
  DataSmall,
  DataValue,
  ErrorText,
  ScreenTitle,
} from "@/components/ui/Typography";
import { COPY } from "@/lib/copy";
import { colors } from "@/lib/design-tokens";
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
      className="mt-3 rounded-2xl bg-white px-4 py-4 active:opacity-80"
    >
      <DataSmall>
        {formatPaymentTotalForDisplay(order.total_amount, order.currency)}
      </DataSmall>
      <BodyText className="mt-1" style={{ color: colors.primaryBlue }}>{formatOrderStatus(order)}</BodyText>
      <Caption className="mt-1" style={{ color: colors.charcoal }}>
        {order.created_at
          ? new Date(order.created_at).toLocaleDateString()
          : ""}
      </Caption>
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
      <ScreenTitle centered>
        {placed ? COPY.checkoutSuccessTitle : COPY.ordersTitle}
      </ScreenTitle>

      {placed ? (
        <BodyText className="mt-4" style={{ color: colors.primaryBlue }}>{COPY.ordersPlacedBanner}</BodyText>
      ) : (
        <BodyText className="mt-4">{COPY.ordersBody}</BodyText>
      )}

      {placed ? (
        <BodySmall className="mt-2" style={{ color: colors.charcoal }}>
          {COPY.checkoutSuccessBody}
        </BodySmall>
      ) : (
        <Caption className="mt-2" style={{ color: colors.charcoal }}>
          {COPY.ordersWebhookNote}
        </Caption>
      )}

      {loading ? <SkeletonCardList rows={3} /> : null}

      {message ? (
        <>
          <ErrorText className="mt-4">{message}</ErrorText>
          <Button title={COPY.storeRetry} variant="ghost" onPress={refresh} />
        </>
      ) : null}

      {showHighlight ? (
        <Pressable
          onPress={() => {
            openOrder(showHighlight.id);
          }}
          className="mt-6 rounded-2xl border border-border bg-iceBlue px-4 py-4 active:opacity-80"
        >
          <DataValue>
            {formatPaymentTotalForDisplay(
              showHighlight.total_amount,
              showHighlight.currency,
            )}
          </DataValue>
          <BodyText className="mt-2" style={{ color: colors.primaryBlue }}>
            {formatOrderStatus(showHighlight, highlightItems)}
          </BodyText>

          {highlightItems.length > 0 ? (
            <View className="mt-4">
              <BodySmall style={{ color: colors.charcoal }}>
                {COPY.orderItemsLabel}
              </BodySmall>
              {highlightItems.map((item) => (
                <BodySmall
                  key={item.id}
                  className="mt-2"
                  centered
                  style={{ color: colors.charcoal }}
                >
                  {item.product_name} × {item.quantity} — ₹
                  {(item.unit_price * item.quantity).toLocaleString("en-IN")}
                </BodySmall>
              ))}
            </View>
          ) : null}

          <ErrorText className="mt-4">
            {COPY.checkoutViewOrder}
          </ErrorText>
        </Pressable>
      ) : null}

      {!loading && !message && !placed && orders.length === 0 ? (
        <BodyText className="mt-6" centered>{COPY.ordersEmpty}</BodyText>
      ) : null}

      {!loading && !message && orders.length > 0 && !placed ? (
        <BodySmall className="mt-6" style={{ color: colors.charcoal }}>
          {COPY.ordersTapForDetail}
        </BodySmall>
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
