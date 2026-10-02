import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
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
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/** Same semantic mapping as the orders list: green done, amber moving, red stopped. */
function orderStatusTone(order: StoreOrderRow): ChipTone {
  if (order.payment_status === "failed" || order.fulfilment_status === "cancelled") {
    return "red";
  }
  if (order.payment_status === "paid") {
    if (
      order.fulfilment_status === "delivered" ||
      order.fulfilment_status === "sample_collected"
    ) {
      return "green";
    }
    if (order.fulfilment_status === "shipped") {
      return "amber";
    }
  }
  return "neutral";
}

function TimelineRow({ step, last }: { step: OrderTimelineStep; last: boolean }) {
  const stopped =
    step.label === COPY.orderTimelinePaymentFailed ||
    step.label === COPY.orderTimelineCancelled;
  const dotColor = stopped
    ? Colors.red
    : step.current
      ? Colors.orange
      : step.done
        ? Colors.green
        : Colors.line;

  return (
    <View style={styles.timelineRow}>
      <View style={styles.rail}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        {last ? null : <View style={styles.railLine} />}
      </View>
      <View style={styles.timelineText}>
        <Text
          style={[
            styles.stepLabel,
            step.current ? styles.stepLabelCurrent : null,
            stopped ? styles.stepLabelStopped : null,
          ]}
        >
          {step.label}
        </Text>
        <Text style={styles.stepDetail}>{step.detail}</Text>
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
      <ScreenHeader
        title={COPY.orderDetailTitle}
        onBack={() => router.replace(routes.orders)}
        backLabel={COPY.orderBackOrders}
      />

      {loading ? <StaticSkeleton rows={3} /> : null}

      {message ? (
        <Card>
          <Text style={styles.error}>{message}</Text>
          <TextButton title={COPY.storeRetry} onPress={() => void refresh()} />
        </Card>
      ) : null}

      {!loading && !message && order ? (
        <>
          <Card elevated>
            <Text style={styles.total}>
              {formatPaymentTotalForDisplay(order.total_amount, order.currency)}
            </Text>
            <View style={styles.statusChip}>
              <Chip
                label={formatOrderStatus(order, items)}
                tone={orderStatusTone(order)}
              />
            </View>
            {order.created_at ? (
              <Text style={styles.placedOn}>
                {new Date(order.created_at).toLocaleString()}
              </Text>
            ) : null}
          </Card>

          <SectionTitle title={COPY.orderItemsLabel} icon="package" />
          {items.length === 0 ? (
            <Card>
              <Text style={styles.body}>{COPY.ordersEmpty}</Text>
            </Card>
          ) : (
            <View style={styles.stack}>
              {items.map((item) => (
                <Card key={item.id}>
                  <Text style={styles.itemName}>{item.product_name}</Text>
                  <View style={styles.itemFoot}>
                    <Text style={styles.itemUnit}>
                      {item.quantity} × ₹
                      {item.unit_price.toLocaleString("en-IN")}
                    </Text>
                    <Text style={styles.itemTotal}>
                      ₹
                      {(item.unit_price * item.quantity).toLocaleString(
                        "en-IN",
                      )}
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          )}

          <SectionTitle
            title={COPY.orderTimelineTitle}
            subtitle={COPY.ordersWebhookNote}
            icon="truck"
          />
          <Card>
            {timeline.map((step, index) => (
              <TimelineRow
                key={step.label}
                step={step}
                last={index === timeline.length - 1}
              />
            ))}
          </Card>

          <View style={styles.metaWrap}>
            <Card>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{COPY.orderPaymentLabel}</Text>
                <Text style={styles.metaValue}>{order.payment_status}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>
                  {COPY.orderFulfilmentLabel}
                </Text>
                <Text style={styles.metaValue}>{order.fulfilment_status}</Text>
              </View>
            </Card>
          </View>
        </>
      ) : null}

      <View style={styles.footer}>
        <PrimaryButton
          title={COPY.orderBackOrders}
          onPress={() => {
            router.replace(routes.orders);
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    ...typeStyle("body"),
    color: Colors.red,
  },
  body: {
    ...typeStyle("body"),
    color: Colors.body,
  },
  total: {
    ...typeStyle("dataBig"),
    color: Colors.orange,
  },
  statusChip: {
    marginTop: Space.sm,
  },
  placedOn: {
    marginTop: Space.md,
    ...typeStyle("caption"),
    color: Colors.muted,
  },
  stack: {
    gap: Gap.cards,
  },
  itemName: {
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  itemFoot: {
    marginTop: Space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.sm,
  },
  itemUnit: {
    ...typeStyle("secondary"),
    color: Colors.muted,
  },
  itemTotal: {
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  timelineRow: {
    flexDirection: "row",
    gap: Space.md,
  },
  rail: {
    width: 12,
    alignItems: "center",
  },
  dot: {
    marginTop: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  railLine: {
    flex: 1,
    width: 2,
    marginTop: Space.xs,
    marginBottom: -Space.xs,
    backgroundColor: Colors.line,
  },
  timelineText: {
    flex: 1,
    paddingBottom: Gap.rowY,
  },
  stepLabel: {
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  stepLabelCurrent: {
    color: Colors.orangeDeep,
  },
  stepLabelStopped: {
    color: Colors.red,
  },
  stepDetail: {
    marginTop: 2,
    ...typeStyle("secondary"),
    color: Colors.muted,
  },
  metaWrap: {
    marginTop: Gap.sections,
  },
  metaDivider: {
    marginVertical: Space.sm,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.line,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.sm,
    paddingVertical: Space.xs,
  },
  metaLabel: {
    ...typeStyle("label"),
    color: Colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  metaValue: {
    ...typeStyle("secondary"),
    color: Colors.ink,
    textTransform: "capitalize",
  },
  footer: {
    marginTop: Gap.beforeFooter - Space.md,
  },
});
