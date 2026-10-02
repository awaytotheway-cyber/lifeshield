import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BarriersAccordion } from "@/components/ui/BarriersAccordion";
import {
  PrimaryButton,
  SecondaryButton,
  TextButton,
} from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
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

function statusTone(row: WeeklyGoalRow): ChipTone {
  if (isOverdue(row)) return "red";
  switch (row.status) {
    case "completed":
      return "green";
    case "missed":
      return "red";
    case "cancelled":
      return "neutral";
    default:
      return "orange";
  }
}

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
    <Screen scroll>
      <ScreenHeader
        title={row?.title ?? COPY.goalsTitle}
        subtitle={row ? goalTypeLabel(row.goal_type) : undefined}
        onBack={() => router.back()}
        backLabel={COPY.goalsTitle}
      />

      {loading ? <StaticSkeleton rows={3} /> : null}

      {!loading && row ? (
        <>
          <Card elevated>
            <View style={styles.cardTop}>
              <Text style={styles.dates}>
                {row.start_date} → {row.end_date}
              </Text>
              <Chip
                label={isOverdue(row) ? COPY.goalsMissedLabel : statusLabel(row.status)}
                tone={statusTone(row)}
              />
            </View>

            <Text style={styles.percent}>{progressPercent(row)}%</Text>
            <Text style={styles.progressLabel}>
              {COPY.goalsProgressLabel} · {row.progress} / {row.target} {row.unit}
            </Text>
            <ProgressBar current={row.progress} total={row.target} />

            {row.note ? <Text style={styles.note}>{row.note}</Text> : null}
          </Card>

          <View style={styles.actions}>
            {row.status === "active" ? (
              <>
                <PrimaryButton
                  title={COPY.goalsLogOne}
                  icon="plus"
                  loading={busy}
                  onPress={() => runAction(() => incrementGoal(row, 1))}
                />
                <SecondaryButton
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
              </>
            ) : (
              <TextButton
                title={COPY.goalsDelete}
                onPress={() => runAction(() => deleteGoal(row.id), true)}
              />
            )}
          </View>
        </>
      ) : null}

      {!loading && row && session.user.id ? (
        <>
          <SectionTitle title="What might get in the way" />
          <BarriersAccordion
            userId={session.user.id}
            category={row.goal_type}
            sourceType="goal"
            sourceId={row.id}
          />
        </>
      ) : null}

      {message ? <Text style={styles.error}>{message}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.sm,
  },
  dates: {
    flex: 1,
    ...typeStyle("secondary"),
    color: Colors.muted,
  },
  percent: {
    ...typeStyle("dataBig"),
    marginTop: Space.md,
    color: Colors.orange,
  },
  progressLabel: {
    ...typeStyle("secondary"),
    marginTop: Space.xs,
    color: Colors.muted,
  },
  note: {
    ...typeStyle("body"),
    marginTop: Space.lg,
    color: Colors.body,
  },
  actions: {
    marginTop: Gap.beforeFooter,
  },
  error: {
    ...typeStyle("secondary"),
    marginTop: Space.lg,
    color: Colors.red,
  },
});
