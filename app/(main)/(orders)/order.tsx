import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { BackBar } from "@/components/ui/BackBar";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { COPY } from "@/lib/copy";
import {
  buildOrderTimeline,
  formatOrderStatus,
  loadOrderDetail,
  type OrderTimelineStep,
  type StoreOrderItemRow,
  type StoreOrderRow,
} from "@/lib/orders";
import { formatPaymentTotalForDisplay } from "@/lib/payment-intent-format";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";
import { Accent } from "@/lib/specimen-tokens";

function TimelineRow({ step }: { step: OrderTimelineStep }) {
  const dotClass = step.current
    ? "bg-tag"
    : step.done
      ? "bg-tag"
      : "bg-sage";
  const textClass = step.current ? "text-tag" : "text-inkFull";

  return (
    <View className="mt-4 flex-row">
      <View className={`mt-1 h-3 w-3 rounded-full ${dotClass}`} />
      <View className="ml-3 flex-1">
        <Text className={`text-base ${textClass}`}>{step.label}</Text>
        <Text className="mt-1 text-sm text-inkFull">{step.detail}</Text>
      </View>
    </View>
  );
}

/**
 * Single order — line items plus payment and fulfilment timeline in plain language.
 */
export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [order, setOrder] = useState<StoreOrderRow | null>(null);
  const [items, setItems] = useState<StoreOrderItemRow[]>([]);

  const refresh = useCallback(async () => {
    if (!session?.user.id) {
      return;
    }
    const orderId = typeof id === "string" ? id.trim() : "";
    if (!orderId) {
      setOrder(null);
      setItems([]);
      setMessage(COPY.orderMissing);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const result = await loadOrderDetail(session.user.id, orderId);
      if (!result.ok) {
        setOrder(null);
        setItems([]);
        setMessage(result.message);
        return;
      }
      setOrder(result.order);
      setItems(result.items);
    } catch {
      setOrder(null);
      setItems([]);
      setMessage(COPY.ordersLoadFailed);
    } finally {
      setLoading(false);
    }
  }, [session?.user.id, id]);

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    void refresh();
  }, [session?.user.id, refresh]);

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  const timeline = order ? buildOrderTimeline(order, items) : [];

  return (
    <Screen scroll>
      <BackBar onPress={() => router.back()} label="Orders" />
      <Text className="text-center text-2xl text-inkFull">
        {COPY.orderDetailTitle}
      </Text>

      {loading ? <ActivityIndicator className="mt-6" color={Accent.tag} /> : null}

      {message ? (
        <>
          <Text className="mt-4 text-center text-tag">{message}</Text>
          <Button title={COPY.storeRetry} variant="ghost" onPress={() => void refresh()} />
        </>
      ) : null}

      {!loading && !message && order ? (
        <>
          <View className="mt-6 rounded-xl bg-paperMount px-4 py-4">
            <Text className="text-center text-xl text-inkFull">
              {formatPaymentTotalForDisplay(order.total_amount, order.currency)}
            </Text>
            <Text className="mt-2 text-center text-tag">
              {formatOrderStatus(order, items)}
            </Text>
            {order.created_at ? (
              <Text className="mt-2 text-center text-xs text-inkFull">
                {new Date(order.created_at).toLocaleString()}
              </Text>
            ) : null}
          </View>

          <Text className="mt-6 text-center text-lg text-inkFull">
            {COPY.orderItemsLabel}
          </Text>
          {items.length === 0 ? (
            <Text className="mt-2 text-center text-inkFull">
              {COPY.ordersEmpty}
            </Text>
          ) : (
            items.map((item) => (
              <View
                key={item.id}
                className="mt-3 rounded-xl border border-sage bg-paperMount px-4 py-3"
              >
                <Text className="text-inkFull">{item.product_name}</Text>
                <Text className="mt-1 text-sm text-inkFull">
                  {item.quantity} × ₹
                  {item.unit_price.toLocaleString("en-IN")} = ₹
                  {(item.unit_price * item.quantity).toLocaleString("en-IN")}
                </Text>
              </View>
            ))
          )}

          <Text className="mt-8 text-center text-lg text-inkFull">
            {COPY.orderTimelineTitle}
          </Text>
          <Text className="mt-1 text-center text-xs text-inkFull">
            {COPY.ordersWebhookNote}
          </Text>

          <View className="mt-2 rounded-xl bg-paperMount px-4 py-2">
            {timeline.map((step) => (
              <TimelineRow key={step.label} step={step} />
            ))}
          </View>

          <View className="mt-6 rounded-xl bg-paperSheet px-4 py-3">
            <Text className="text-sm text-inkFull">
              {COPY.orderPaymentLabel}: {order.payment_status}
            </Text>
            <Text className="mt-1 text-sm text-inkFull">
              {COPY.orderFulfilmentLabel}: {order.fulfilment_status}
            </Text>
          </View>
        </>
      ) : null}

      <Button
        title={COPY.orderBackOrders}
        onPress={() => {
          router.replace(routes.orders);
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
