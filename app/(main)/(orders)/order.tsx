import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { SkeletonCardList } from "@/components/ui/Skeleton";
import {
  BodySmall,
  BodyText,
  Caption,
  CardTitle,
  ErrorText,
  ScreenTitle,
  SectionTitle,
} from "@/components/ui/Typography";
import { COPY } from "@/lib/copy";
import { colors } from "@/lib/design-tokens";
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

function TimelineRow({ step }: { step: OrderTimelineStep }) {
  const dotClass = step.current
    ? "bg-coral"
    : step.done
      ? "bg-teal"
      : "bg-sage";
  const labelColor = step.current ? colors.riskHighText : colors.charcoal;

  return (
    <View className="mt-4 flex-row">
      <View className={`mt-1 h-3 w-3 rounded-full ${dotClass}`} />
      <View className="ml-3 flex-1">
        <BodyText style={{ color: labelColor }}>{step.label}</BodyText>
        <BodySmall className="mt-1" style={{ color: colors.charcoal }}>{step.detail}</BodySmall>
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
      <ScreenTitle centered>
        {COPY.orderDetailTitle}
      </ScreenTitle>

      {loading ? <SkeletonCardList rows={3} /> : null}

      {message ? (
        <>
          <ErrorText className="mt-4" centered>{message}</ErrorText>
          <Button title={COPY.storeRetry} variant="ghost" onPress={() => void refresh()} />
        </>
      ) : null}

      {!loading && !message && order ? (
        <>
          <View className="mt-6 rounded-2xl bg-white px-4 py-4">
            <SectionTitle centered>
              {formatPaymentTotalForDisplay(order.total_amount, order.currency)}
            </SectionTitle>
            <BodyText className="mt-2" centered style={{ color: colors.primaryBlue }}>
              {formatOrderStatus(order, items)}
            </BodyText>
            {order.created_at ? (
              <Caption className="mt-2" centered style={{ color: colors.charcoal }}>
                {new Date(order.created_at).toLocaleString()}
              </Caption>
            ) : null}
          </View>

          <CardTitle className="mt-6" centered>
            {COPY.orderItemsLabel}
          </CardTitle>
          {items.length === 0 ? (
            <BodyText className="mt-2" centered>
              {COPY.ordersEmpty}
            </BodyText>
          ) : (
            items.map((item) => (
              <View
                key={item.id}
                className="mt-3 rounded-2xl border border-border bg-white px-4 py-3"
              >
                <BodyText>{item.product_name}</BodyText>
                <BodySmall className="mt-1" style={{ color: colors.charcoal }}>
                  {item.quantity} × ₹
                  {item.unit_price.toLocaleString("en-IN")} = ₹
                  {(item.unit_price * item.quantity).toLocaleString("en-IN")}
                </BodySmall>
              </View>
            ))
          )}

          <CardTitle className="mt-8" centered>
            {COPY.orderTimelineTitle}
          </CardTitle>
          <Caption className="mt-1" centered style={{ color: colors.charcoal }}>
            {COPY.ordersWebhookNote}
          </Caption>

          <View className="mt-2 rounded-2xl bg-white px-4 py-2">
            {timeline.map((step) => (
              <TimelineRow key={step.label} step={step} />
            ))}
          </View>

          <View className="mt-6 rounded-2xl bg-cream px-4 py-3">
            <BodySmall style={{ color: colors.charcoal }}>
              {COPY.orderPaymentLabel}: {order.payment_status}
            </BodySmall>
            <BodySmall className="mt-1" style={{ color: colors.charcoal }}>
              {COPY.orderFulfilmentLabel}: {order.fulfilment_status}
            </BodySmall>
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
