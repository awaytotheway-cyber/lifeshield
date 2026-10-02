import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { BackButton } from "@/components/ui/BackButton";
import {
  PrimaryButton,
  SecondaryButton,
  TextButton,
} from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Hero } from "@/components/ui/Hero";
import { ResultCard } from "@/components/ui/ResultCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import { getTerm } from "@/lib/plain-language";
import { routes } from "@/lib/routes";
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";
import {
  useQuestionnaireStore,
  type TestOrderRow,
} from "@/stores/questionnaire-store";
import { useTriageStore } from "@/stores/triage-store";

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

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  const showOrders = !loading && !message && orders.length > 0;
  const showEmpty = !loading && !message && orders.length === 0;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Hero>
          <BackButton
            onPress={() => router.replace(routes.home)}
            accessibilityLabel={COPY.resultsBackHome}
          />
          <Text style={styles.heroTitle} accessibilityRole="header">
            {COPY.resultsTitle}
          </Text>
          <Text style={styles.heroLine}>{COPY.resultsBody}</Text>
        </Hero>

        <View style={styles.body}>
          {loading ? <StaticSkeleton rows={4} /> : null}

          {message ? (
            <Card>
              <Text style={styles.error}>{message}</Text>
              <TextButton
                title={COPY.resultsRetry}
                onPress={() => void refresh()}
              />
            </Card>
          ) : null}

          {showEmpty ? (
            <>
              <Card>
                <Text style={styles.emptyHeading}>
                  {COPY.resultsEmptyHeading}
                </Text>
                <Text style={styles.emptyBody}>{COPY.resultsEmpty}</Text>
              </Card>
              <View style={styles.footer}>
                <PrimaryButton
                  title={COPY.resultsOpenQuestionnaire}
                  onPress={() => {
                    router.replace(routes.questionnaire);
                  }}
                />
              </View>
            </>
          ) : null}

          {showOrders ? (
            <>
              <SectionTitle title={COPY.resultsGroupWatching} first />
              <View style={styles.cardStack}>
                {orders.map((order) => {
                  const term = getTerm(order.test_name);
                  return (
                    <ResultCard
                      key={order.id}
                      plainName={term.plainName}
                      meaning={
                        order.trigger_reason?.trim() ||
                        COPY.resultsStatusSuggested
                      }
                      medicalName={term.medicalName}
                      status="attention"
                      statusLabel={COPY.resultsChipDiscuss}
                    />
                  );
                })}
              </View>

              <Card style={styles.nextStep}>
                <Text style={styles.discuss}>{COPY.resultsActionDiscuss}</Text>
              </Card>

              <View style={styles.footer}>
                <PrimaryButton
                  title={COPY.resultsOpenLabResults}
                  onPress={() => {
                    router.push(routes.labResults);
                  }}
                />
                <SecondaryButton
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
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingBottom: Gap.screenBottom,
  },
  heroTitle: {
    ...typeStyle("hero"),
    marginTop: Space.lg,
    color: Colors.ink,
  },
  heroLine: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
  },
  body: {
    paddingHorizontal: Space.screenH,
    // Section 8: 40px between the hero and the first section.
    paddingTop: Gap.sections,
  },
  cardStack: {
    gap: Gap.cards,
  },
  error: {
    ...typeStyle("body"),
    color: Colors.red,
  },
  emptyHeading: {
    ...typeStyle("section"),
    color: Colors.ink,
  },
  emptyBody: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
  },
  nextStep: {
    marginTop: Gap.sections,
  },
  discuss: {
    ...typeStyle("body"),
    color: Colors.body,
  },
  footer: {
    marginTop: Gap.screenBottom,
  },
});
