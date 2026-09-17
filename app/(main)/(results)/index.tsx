import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { EmptyHourglass, InsightLens } from "@/components/illustrations";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MilestoneStatStrip } from "@/components/ui/MilestoneStatStrip";
import { ResultCard } from "@/components/ui/ResultCard";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { FEATURES } from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { colors, spacing } from "@/lib/design-tokens";
import { getTerm } from "@/lib/plain-language";
import { routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import {
  useQuestionnaireStore,
  type TestOrderRow,
} from "@/stores/questionnaire-store";
import { useTriageStore } from "@/stores/triage-store";

type ListRow =
  | { kind: "heading"; id: string; title: string }
  | { kind: "order"; id: string; order: TestOrderRow };

export default function ResultsScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const loadTestOrders = useQuestionnaireStore((state) => state.loadTestOrders);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [orders, setOrders] = useState<TestOrderRow[]>([]);

  const refresh = useCallback(async () => {
    if (!session?.user.id) {
      return;
    }
    setLoading(true);
    try {
      const result = await loadTestOrders(session.user.id);
      if (!result.ok) {
        setMessage(result.message ?? COPY.resultsLoadFailed);
        setOrders([]);
      } else {
        setOrders(result.orders);
        setMessage(null);
      }
    } catch {
      setMessage(COPY.resultsLoadFailed);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user.id, loadTestOrders]);

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    void refresh();
  }, [session?.user.id, refresh]);

  const listData = useMemo<ListRow[]>(() => {
    if (orders.length === 0) {
      return [];
    }
    return [
      { kind: "heading", id: "watch", title: COPY.resultsGroupWatching },
      ...orders.map((order) => ({
        kind: "order" as const,
        id: order.id,
        order,
      })),
    ];
  }, [orders]);

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
    <Screen contentPadding={spacing.screenX} centered={false}>
      <ScreenHeader
        title={COPY.resultsTitle}
        onBack={() => router.replace(routes.home)}
        backLabel={COPY.resultsBackHome}
      />
      <Text style={styles.body}>{COPY.resultsBody}</Text>

      {!loading && !message && orders.length > 0 ? (
        <View style={styles.stats}>
          <MilestoneStatStrip
            stats={[
              {
                id: "count",
                value: orders.length,
                label: "Suggested tests",
              },
              {
                id: "tiers",
                value: new Set(orders.map((o) => o.test_tier)).size,
                label: "Focus areas",
              },
              {
                id: "next",
                value: "Discuss",
                label: "With clinician",
              },
            ]}
          />
        </View>
      ) : null}

      {loading ? <StaticSkeleton rows={4} /> : null}

      {message ? (
        <>
          <Text style={styles.error}>{message}</Text>
          <TextButton title={COPY.resultsRetry} onPress={() => void refresh()} />
        </>
      ) : null}

      {!loading && !message && orders.length === 0 ? (
        <>
          <EmptyState
            icon="bar-chart-2"
            heading={COPY.resultsEmptyHeading}
            explanation={COPY.resultsEmpty}
            illustration={<EmptyHourglass width={100} height={100} />}
          />
          <PrimaryButton
            title={COPY.resultsOpenQuestionnaire}
            onPress={() => {
              router.replace(routes.questionnaire);
            }}
          />
        </>
      ) : null}

      {!loading && !message && orders.length > 0 ? (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.insight}>
              <InsightLens width={120} height={100} />
            </View>
          }
          renderItem={({ item }) => {
            if (item.kind === "heading") {
              return <Text style={styles.group}>{item.title}</Text>;
            }
            const term = getTerm(item.order.test_name);
            return (
              <View style={styles.cardGap}>
                <ResultCard
                  plainName={term.plainName}
                  meaning={
                    item.order.trigger_reason?.trim() ||
                    COPY.resultsStatusSuggested
                  }
                  medicalName={term.medicalName}
                  status="attention"
                  statusLabel={COPY.resultsChipDiscuss}
                />
              </View>
            );
          }}
          ListFooterComponent={
            <View>
              <Text style={styles.discuss}>{COPY.resultsActionDiscuss}</Text>
              {FEATURES.guidedBooking ? (
                <PrimaryButton
                  title={COPY.resultsBookTests}
                  onPress={() => {
                    router.push(routes.booking);
                  }}
                />
              ) : null}
              <TextButton
                title={COPY.resultsOpenLabResults}
                onPress={() => {
                  router.push(routes.labResults);
                }}
              />
              <TextButton
                title={COPY.homeOpenPlan}
                onPress={() => {
                  router.push(routes.plan);
                }}
              />
              <TextButton
                title={COPY.homeOpenStore}
                onPress={() => {
                  router.push(routes.store);
                }}
              />
            </View>
          }
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
    textAlign: "left",
    marginBottom: 8,
  },
  stats: {
    marginBottom: 12,
  },
  error: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.coral,
    textAlign: "center",
  },
  insight: {
    alignItems: "center",
    marginBottom: 8,
  },
  list: {
    paddingBottom: 32,
  },
  group: {
    marginTop: 16,
    marginBottom: 8,
    fontFamily: fontFamily.bodySemi,
    fontSize: 20,
    color: colors.primaryBlue,
  },
  cardGap: {
    marginBottom: 12,
  },
  discuss: {
    marginTop: 16,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.charcoal,
    textAlign: "center",
  },
});
