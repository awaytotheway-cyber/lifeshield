import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import type { Href } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { DotProgress, type DotState } from "@/components/ui/DotProgress";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import {
  buildTenStepRows,
  completedCount,
  type TenStepId,
  type TenStepInputs,
  type TenStepRow,
} from "@/lib/journey-ten";
import { loadOwnConnections } from "@/lib/buddies";
import { activityMinutesByDay, loadRecentActivities } from "@/lib/partners";
import { hasOwnInterventions } from "@/lib/plan";
import { hasOwnTestResults } from "@/lib/test-results";
import { loadOwnGoals } from "@/lib/weekly-goals";
import { loadUserContext } from "@/lib/user-context";
import { routes } from "@/lib/routes";
import { Colors, Gap, Radius, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";
import {
  completedSectionCount,
  useQuestionnaireStore,
} from "@/stores/questionnaire-store";

const STATE_LABEL: Record<TenStepRow["state"], string> = {
  complete: "Complete",
  current: "Current",
  upcoming: "Upcoming",
};

export default function JourneyDashboardScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const progress = useQuestionnaireStore((state) => state.progress);
  const hasRecommendations = useQuestionnaireStore((state) => state.hasRecommendations);
  const [rows, setRows] = useState<TenStepRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const uid = session?.user.id;
    if (!uid) return;
    setLoading(true);
    const [ctx, results, plan, goals, acts, buddies] = await Promise.all([
      loadUserContext(uid),
      hasOwnTestResults(uid),
      hasOwnInterventions(uid),
      loadOwnGoals(uid),
      loadRecentActivities(uid, 200),
      loadOwnConnections(uid),
    ]);
    const answeredCount = completedSectionCount(progress);
    const weeklyMinutes = acts.ok
      ? activityMinutesByDay(acts.rows, 7).reduce((s, d) => s + d.minutes, 0)
      : 0;

    const goalRows = goals.ok ? goals.rows : [];
    const activeGoals = goalRows.filter((g) => g.status === "active").length;
    const completedGoals = goalRows.filter((g) => g.status === "completed").length;

    const activeBuddies = buddies.ok
      ? buddies.rows.filter((c) => c.status === "active").length
      : 0;

    const createdAt = session?.user.created_at
      ? new Date(session.user.created_at)
      : new Date();
    const weeksSinceStart = Math.max(
      0,
      Math.floor((Date.now() - createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000)),
    );

    const inputs: TenStepInputs = {
      hasProfile: ctx.ok,
      hasBaselineAnswers: answeredCount >= 5,
      hasRecommendations,
      hasLabResults: results.ok && results.hasRows,
      hasPlan: plan.ok && plan.hasRows,
      activeGoalCount: activeGoals,
      completedGoalCount: completedGoals,
      loggedActivityMinutes7d: weeklyMinutes,
      triedBarrierCount: 0, // fetched lazily below to avoid slowing initial load
      activeBuddyCount: activeBuddies,
      weeksSinceStart,
    };

    const hrefs: Partial<Record<TenStepId, string>> = {
      registration: routes.profile as string,
      baseline: routes.questionnaire as string,
      test_recommendations: routes.results as string,
      test_results: routes.labResults as string,
      lifestyle_plan: routes.plan as string,
      goal_setting: routes.goals as string,
      habit_tracking: routes.partners as string,
      barriers_strategies: routes.plan as string,
      social_support: routes.buddies as string,
      iterate: routes.home as string,
    };

    setRows(
      buildTenStepRows(inputs, COPY as unknown as Record<string, string>, hrefs),
    );
    setLoading(false);
  }, [session, progress, hasRecommendations]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!session) return <Redirect href={routes.login} />;

  const done = completedCount(rows);
  const total = rows.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const dots: DotState[] = rows.map((row) => row.state);

  return (
    <Screen scroll>
      <ScreenHeader
        title={COPY.journeyDashTitle}
        subtitle={COPY.journeyDashSubtitle}
        onBack={() => router.replace(routes.home)}
        backLabel={COPY.orderBackHome}
      />

      <Card elevated>
        <Text style={styles.progressValue}>
          {done}/{total || 10}
        </Text>
        <Text style={styles.progressLabel}>
          {COPY.journeyDashProgress} · {pct}%
        </Text>
        <ProgressBar current={done} total={total || 10} />
        {dots.length > 0 ? (
          <View style={styles.dots}>
            <DotProgress
              states={dots}
              accessibilityLabel={`${done} of ${total} ${COPY.journeyDashProgress}`}
            />
          </View>
        ) : null}
      </Card>

      {done >= 3 ? (
        <View style={styles.celebrate}>
          <Feather name="star" size={18} color={Colors.amber} />
          <Text style={styles.celebrateText}>{COPY.journeyDashCelebrate}</Text>
        </View>
      ) : null}

      <SectionTitle title="Your milestones" />

      {loading && rows.length === 0 ? <StaticSkeleton rows={5} /> : null}

      <View style={styles.list}>
        {rows.map((row) => (
          <Card
            key={row.id}
            onPress={
              row.href
                ? () => router.push(row.href as unknown as Href)
                : undefined
            }
            accessibilityLabel={`${row.title}, ${STATE_LABEL[row.state]}`}
            style={row.state === "current" ? styles.cardCurrent : undefined}
          >
            <View style={styles.rowTop}>
              <Text style={styles.title}>{row.title}</Text>
              <Chip
                label={STATE_LABEL[row.state]}
                tone={
                  row.state === "complete"
                    ? "green"
                    : row.state === "current"
                      ? "orange"
                      : "neutral"
                }
              />
            </View>
            <Text style={styles.desc}>{row.body}</Text>
            {row.metrics.length > 0 ? (
              <View style={styles.metricsRow}>
                {row.metrics.map((m) => (
                  <View key={m.label} style={styles.metric}>
                    <Text style={styles.metricValue}>{m.value}</Text>
                    <Text style={styles.metricLabel}>{m.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressValue: {
    ...typeStyle("dataBig"),
    color: Colors.orange,
  },
  progressLabel: {
    ...typeStyle("secondary"),
    marginTop: Space.xs,
    color: Colors.muted,
  },
  dots: {
    marginTop: Space.md,
  },
  celebrate: {
    marginTop: Gap.cards,
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    padding: Space.md,
    borderRadius: Radius.input,
    backgroundColor: Colors.amberTint,
  },
  celebrateText: {
    flex: 1,
    ...typeStyle("secondary"),
    color: Colors.body,
  },
  list: {
    gap: Gap.cards,
  },
  cardCurrent: {
    borderWidth: 2,
    borderColor: Colors.orange,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  title: {
    flex: 1,
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  desc: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
  },
  metricsRow: {
    marginTop: Space.md,
    flexDirection: "row",
    gap: Space.xl,
  },
  metric: {
    alignItems: "flex-start",
  },
  metricValue: {
    ...typeStyle("section"),
    color: Colors.orange,
  },
  metricLabel: {
    ...typeStyle("caption"),
    marginTop: 2,
    color: Colors.muted,
  },
});
