import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { EmptyBox } from "@/components/illustrations";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
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
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/**
 * Semantic colour for an order's status chip. Delivered is green, anything in
 * transit is amber, a failed or cancelled order is red, everything else stays
 * neutral. The wording itself still comes from formatOrderStatus().
 */
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

function OrderListCard({
  order,
  onPress,
}: {
  order: StoreOrderRow;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} accessibilityLabel={formatOrderStatus(order)}>
      <View style={styles.rowHead}>
        <Text style={styles.orderTotal}>
          {formatPaymentTotalForDisplay(order.total_amount, order.currency)}
        </Text>
        <Chip label={formatOrderStatus(order)} tone={orderStatusTone(order)} />
      </View>
      <Text style={styles.orderDate}>
        {order.created_at ? new Date(order.created_at).toLocaleDateString() : ""}
      </Text>
    </Card>
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

  const listOrders = orders.filter(
    (order) => !placed || order.id !== highlightOrderId,
  );

  return (
    <Screen scroll>
      <ScreenHeader
        title={placed ? COPY.checkoutSuccessTitle : COPY.ordersTitle}
        subtitle={placed ? COPY.ordersPlacedBanner : COPY.ordersBody}
        onBack={() => router.replace(routes.home)}
        backLabel={COPY.orderBackHome}
      />

      {loading ? <StaticSkeleton rows={3} /> : null}

      {message ? (
        <Card>
          <Text style={styles.error}>{message}</Text>
          <TextButton title={COPY.storeRetry} onPress={refresh} />
        </Card>
      ) : null}

      {showHighlight ? (
        <Card
          elevated
          onPress={() => {
            openOrder(showHighlight.id);
          }}
          accessibilityLabel={COPY.checkoutViewOrder}
        >
          <Text style={styles.highlightTotal}>
            {formatPaymentTotalForDisplay(
              showHighlight.total_amount,
              showHighlight.currency,
            )}
          </Text>
          <View style={styles.highlightChip}>
            <Chip
              label={formatOrderStatus(showHighlight, highlightItems)}
              tone={orderStatusTone(showHighlight)}
            />
          </View>

          {placed ? (
            <Text style={styles.body}>{COPY.checkoutSuccessBody}</Text>
          ) : null}

          {highlightItems.length > 0 ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.itemsLabel}>{COPY.orderItemsLabel}</Text>
              {highlightItems.map((item) => (
                <Text key={item.id} style={styles.itemLine}>
                  {item.product_name} × {item.quantity} — ₹
                  {(item.unit_price * item.quantity).toLocaleString("en-IN")}
                </Text>
              ))}
            </>
          ) : null}

          <Text style={styles.viewOrder}>{COPY.checkoutViewOrder} →</Text>
        </Card>
      ) : null}

      {!loading && !message && !placed && orders.length === 0 ? (
        <Card>
          <View style={styles.emptyWrap}>
            <EmptyBox width={120} height={120} />
            <Text style={styles.emptyBody}>{COPY.ordersEmpty}</Text>
          </View>
        </Card>
      ) : null}

      {!loading && !message && listOrders.length > 0 ? (
        <>
          {/* The header already says "Your orders" unless this is the
              post-checkout success view, so only repeat it when it is. */}
          {placed ? (
            <SectionTitle
              title={COPY.ordersTitle}
              subtitle={COPY.ordersTapForDetail}
            />
          ) : (
            <Text
              style={[
                styles.listHint,
                showHighlight ? styles.listHintAfterCard : null,
              ]}
            >
              {COPY.ordersTapForDetail}
            </Text>
          )}
          <View style={styles.stack}>
            {listOrders.map((order) => (
              <OrderListCard
                key={order.id}
                order={order}
                onPress={() => {
                  openOrder(order.id);
                }}
              />
            ))}
          </View>
          <Text style={styles.footnote}>{COPY.ordersWebhookNote}</Text>
        </>
      ) : null}

      <View style={styles.footer}>
        <PrimaryButton
          title={COPY.orderBackStore}
          icon="shopping-bag"
          onPress={() => {
            router.replace(routes.store);
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
    marginTop: Space.md,
    ...typeStyle("body"),
    color: Colors.body,
  },
  highlightTotal: {
    ...typeStyle("dataBig"),
    color: Colors.orange,
  },
  highlightChip: {
    marginTop: Space.sm,
  },
  divider: {
    marginVertical: Space.md,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.line,
  },
  itemsLabel: {
    ...typeStyle("label"),
    color: Colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  itemLine: {
    marginTop: Space.sm,
    ...typeStyle("secondary"),
    color: Colors.body,
  },
  viewOrder: {
    marginTop: Space.md,
    ...typeStyle("label"),
    color: Colors.orangeDeep,
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
  listHint: {
    marginBottom: Gap.cards,
    ...typeStyle("label"),
    color: Colors.muted,
  },
  listHintAfterCard: {
    marginTop: Gap.sections,
  },
  stack: {
    gap: Gap.cards,
  },
  rowHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.sm,
  },
  orderTotal: {
    flexShrink: 1,
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  orderDate: {
    marginTop: Space.sm,
    ...typeStyle("caption"),
    color: Colors.muted,
  },
  footnote: {
    marginTop: Space.md,
    ...typeStyle("caption"),
    color: Colors.muted,
  },
  footer: {
    marginTop: Gap.beforeFooter - Space.md,
  },
});
