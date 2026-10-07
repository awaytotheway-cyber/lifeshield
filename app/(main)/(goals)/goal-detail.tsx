import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BarriersAccordion } from "@/components/ui/BarriersAccordion";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import { routes } from "@/lib/routes";
import {
  cancelGoal,
  completeGoal,
  deleteGoal,
  goalTypeLabel,
  incrementGoal,
  isOverdue,
  loadOwnGoals,
  markGoalMissed,
  progressPercent,
  statusLabel,
  type WeeklyGoalRow,
} from "@/lib/weekly-goals";
import { useAuthStore } from "@/stores/auth-store";
import { Accent, Edge, Ink, Measure, Paper, SpecimenType } from "@/lib/specimen-tokens";

export default function GoalDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const goalId = typeof params.id === "string" ? params.id : null;
  const session = useAuthStore((state) => state.session);
  const [row, setRow] = useState<WeeklyGoalRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId || !goalId) return;
    setLoading(true);
    const result = await loadOwnGoals(userId);
    setLoading(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    const found = result.rows.find((r) => r.id === goalId) ?? null;
    setRow(found);
    if (!found) setMessage("This goal is no longer available.");
  }, [session?.user.id, goalId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  const runAction = async (
    fn: () => Promise<{ ok: true; row?: WeeklyGoalRow } | { ok: false; message: string }>,
    goBack = false,
  ) => {
    setBusy(true);
    setMessage(null);
    const result = await fn();
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    if (goBack) {
      router.replace(routes.goals);
      return;
    }
    if ("row" in result && result.row) {
      setRow(result.row);
    } else {
      await load();
    }
  };

  return (
    <Screen scroll contentPadding={Measure.gutter} centered={false}>
      <ScreenHeader
        title={COPY.goalsTitle}
        onBack={() => router.back()}
        backLabel={COPY.goalsTitle}
      />
      {loading ? <StaticSkeleton rows={4} /> : null}
      {!loading && row ? (
        <View style={styles.card}>
          <Text style={styles.type}>{goalTypeLabel(row.goal_type)}</Text>
          <Text style={styles.title}>{row.title}</Text>
          <Text style={styles.meta}>
            {row.start_date} → {row.end_date}
          </Text>
          <Text style={styles.status}>
            {isOverdue(row) ? COPY.goalsMissedLabel : statusLabel(row.status)}
          </Text>

          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>{COPY.goalsProgressLabel}</Text>
            <Text style={styles.progressValue}>
              {row.progress} / {row.target} {row.unit} · {progressPercent(row)}%
            </Text>
          </View>
          <ProgressBar current={row.progress} total={row.target} />

          {row.note ? <Text style={styles.note}>{row.note}</Text> : null}

          {row.status === "active" ? (
            <View style={styles.actions}>
              <PrimaryButton
                title={COPY.goalsLogOne}
                loading={busy}
                onPress={() => runAction(() => incrementGoal(row, 1))}
              />
              <TextButton
                title={COPY.goalsMarkComplete}
                onPress={() => runAction(() => completeGoal(row.id))}
              />
              <TextButton
                title={COPY.goalsEndMissed}
                onPress={() => runAction(() => markGoalMissed(row.id))}
              />
              <TextButton
                title={COPY.goalsCancelGoal}
                onPress={() => runAction(() => cancelGoal(row.id))}
              />
            </View>
          ) : (
            <View style={styles.actions}>
              <TextButton
                title={COPY.goalsDelete}
                onPress={() => runAction(() => deleteGoal(row.id), true)}
              />
            </View>
          )}
        </View>
      ) : null}

      {!loading && row && session.user.id ? (
        <BarriersAccordion
          userId={session.user.id}
          category={row.goal_type}
          sourceType="goal"
          sourceId={row.id}
        />
      ) : null}
      {message ? <Text style={styles.error}>{message}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Measure.base,
    backgroundColor: Paper.mount,
    borderRadius: Edge.mount,
    padding: Measure.loose,
  },
  type: {
    fontFamily: SpecimenType.mono,
    fontSize: 14,
    letterSpacing: 0.4,
    color: Ink.soft,
    textTransform: "uppercase",
  },
  title: {
    marginTop: Measure.tight,
    fontFamily: SpecimenType.serif,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
    color: Ink.full,
  },
  meta: {
    marginTop: Measure.hair,
    fontFamily: SpecimenType.mono,
    fontSize: 15,
    lineHeight: 20,
    color: Ink.soft,
  },
  status: {
    marginTop: Measure.tight,
    fontFamily: SpecimenType.monoBold,
    fontSize: 16,
    color: Accent.tag,
  },
  progressRow: {
    marginTop: Measure.loose,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontFamily: SpecimenType.mono,
    fontSize: 15,
    color: Ink.soft,
  },
  progressValue: {
    fontFamily: SpecimenType.monoBold,
    fontSize: 15,
    color: Ink.full,
  },
  note: {
    marginTop: Measure.loose,
    fontFamily: SpecimenType.mono,
    fontSize: 16,
    lineHeight: 24,
    color: Ink.soft,
  },
  actions: {
    marginTop: Measure.section,
    gap: Measure.tight,
  },
  error: {
    marginTop: Measure.base,
    fontFamily: SpecimenType.mono,
    color: Accent.tag,
  },
});
