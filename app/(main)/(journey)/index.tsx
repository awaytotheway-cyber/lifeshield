import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import type { Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
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
import { fontFamily } from "@/lib/typography";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { Icon } from "@/components/ui/Icon";
import {
  completedSectionCount,
  useQuestionnaireStore,
} from "@/stores/questionnaire-store";

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

  return (
    <Screen scroll contentPadding={spacing.screenX} centered={false}>
      <ScreenHeader
        title={COPY.journeyDashTitle}
        onBack={() => router.replace(routes.home)}
        backLabel={COPY.orderBackHome}
      />
      <Text style={styles.body}>{COPY.journeyDashSubtitle}</Text>

      <View style={styles.progressCard}>
        <Text style={styles.progressValue}>{done}/{total}</Text>
        <Text style={styles.progressLabel}>
          {COPY.journeyDashProgress} · {pct}%
        </Text>
      </View>

      {done >= 3 ? (
        <View style={styles.celebrate}>
          <Icon name="star" size={16} color={colors.riskModerate} />
          <Text style={styles.celebrateText}>{COPY.journeyDashCelebrate}</Text>
        </View>
      ) : null}

      {loading && rows.length === 0 ? <StaticSkeleton rows={5} /> : null}

      {rows.map((row) => (
        <Pressable
          key={row.id}
          accessibilityRole="button"
          accessibilityLabel={`${row.title}, ${row.state}`}
          onPress={() => row.href && router.push(row.href as unknown as Href)}
          style={({ pressed }) => [
            styles.card,
            row.state === "complete" && styles.cardComplete,
            row.state === "current" && styles.cardCurrent,
            pressed && styles.cardPressed,
          ]}
        >
          <View style={styles.rowTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{row.title}</Text>
              <Text style={styles.desc}>{row.body}</Text>
            </View>
            <StateBadge state={row.state} />
          </View>
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
        </Pressable>
      ))}
    </Screen>
  );
}

function StateBadge({ state }: { state: "complete" | "current" | "upcoming" }) {
  const bg =
    state === "complete"
      ? colors.riskLowLight
      : state === "current"
        ? colors.iceBlue
        : "transparent";
  const fg =
    state === "complete"
      ? colors.riskLow
      : state === "current"
        ? colors.primaryBlue
        : colors.mist;
  const icon =
    state === "complete" ? "check-circle" : state === "current" ? "play-circle" : "circle";
  return (
    <View style={[badgeStyles.wrap, { backgroundColor: bg }]}>
      <Icon name={icon} size={14} color={fg} />
      <Text style={[badgeStyles.text, { color: fg }]}>{state}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.chip,
  },
  text: {
    // Status chips are the one place the design system allows ALL CAPS,
    // for one or two words only. Tracking follows the chip spec.
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

const styles = StyleSheet.create({
  body: {
    marginTop: spacing.sm,
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.slate,
  },
  progressCard: {
    marginTop: spacing.base,
    padding: spacing.base,
    borderRadius: radius.card,
    backgroundColor: colors.iceBlue,
    alignItems: "center",
  },
  progressValue: {
    fontFamily: fontFamily.heroStat,
    fontSize: 44,
    color: colors.primaryBlue,
  },
  progressLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.slate,
    letterSpacing: 0.2,
  },
  celebrate: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radius.alert,
    backgroundColor: colors.riskModerateLight,
  },
  celebrateText: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.charcoal,
  },
  card: {
    marginTop: spacing.sm,
    padding: spacing.base,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  cardComplete: { opacity: 0.9 },
  cardCurrent: {
    borderWidth: 2,
    borderColor: colors.primaryBlue,
  },
  cardPressed: { opacity: 0.85 },
  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 16,
    color: colors.charcoal,
  },
  desc: {
    marginTop: 2,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.slate,
  },
  metricsRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    gap: spacing.md,
  },
  metric: { alignItems: "flex-start" },
  metricValue: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 18,
    color: colors.primaryBlue,
  },
  metricLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    color: colors.slate,
    letterSpacing: 0.2,
  },
});
