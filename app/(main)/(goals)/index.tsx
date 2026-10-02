import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import { goalDetailHref, routes } from "@/lib/routes";
import { Colors, Font, Gap, Space, typeStyle } from "@/lib/theme";
import {
  goalTypeLabel,
  isOverdue,
  loadOwnGoals,
  progressPercent,
  statusLabel,
  type WeeklyGoalRow,
} from "@/lib/weekly-goals";
import { useAuthStore } from "@/stores/auth-store";

type LoadState = "idle" | "loading" | "ready" | "error";

/** Status pill colour: green when done, red when missed, orange while live. */
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

function GoalCard({ row, onPress }: { row: WeeklyGoalRow; onPress: () => void }) {
  const pct = progressPercent(row);
  const overdue = isOverdue(row);
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${row.title} — ${statusLabel(row.status)}, ${pct}% progress`}
    >
      <View style={styles.cardTop}>
        <Text style={styles.type}>{goalTypeLabel(row.goal_type)}</Text>
        <Chip
          label={overdue ? COPY.goalsMissedLabel : statusLabel(row.status)}
          tone={statusTone(row)}
        />
      </View>
      <Text style={styles.goalTitle}>{row.title}</Text>
      <Text style={styles.meta}>
        {row.progress} / {row.target} {row.unit} · ends {row.end_date}
      </Text>
      <ProgressBar current={row.progress} total={row.target} />
    </Card>
  );
}

export default function GoalsListScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [rows, setRows] = useState<WeeklyGoalRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) {
      setLoadState("error");
      setMessage(COPY.goalsLoadFailed);
      return;
    }
    setLoadState("loading");
    setMessage(null);
    const result = await loadOwnGoals(userId);
    if (!result.ok) {
      setLoadState("error");
      setMessage(result.message);
      setRows([]);
      return;
    }
    setLoadState("ready");
    setRows(result.rows);
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  const loading = loadState === "loading";
  const showEmpty = loadState === "ready" && !message && rows.length === 0;

  return (
    <Screen scroll>
      <ScreenHeader
        title={COPY.goalsTitle}
        subtitle={COPY.goalsSubtitle}
        onBack={() => router.replace(routes.home)}
        backLabel={COPY.orderBackHome}
      />

      <PrimaryButton
        title={COPY.goalsNewCta}
        icon="plus"
        style={styles.cta}
        onPress={() => router.push(routes.newGoal)}
      />

      <SectionTitle title="This week" />

      {loading ? <StaticSkeleton rows={3} /> : null}

      {message ? (
        <>
          <Text style={styles.error}>{message}</Text>
          <TextButton title={COPY.followUpRetry} onPress={() => void load()} />
        </>
      ) : null}

      {showEmpty ? (
        <EmptyState
          icon="target"
          heading={COPY.goalsEmptyTitle}
          explanation={COPY.goalsEmptyBody}
        />
      ) : null}

      {loadState === "ready" && rows.length > 0 ? (
        <View style={styles.list}>
          {rows.map((row) => (
            <GoalCard
              key={row.id}
              row={row}
              onPress={() => router.push(goalDetailHref(row.id))}
            />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cta: {
    marginTop: 0,
  },
  list: {
    gap: Gap.cards,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.sm,
  },
  type: {
    ...typeStyle("label"),
    color: Colors.muted,
  },
  goalTitle: {
    marginTop: Space.sm,
    fontFamily: Font.serif,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.3,
    color: Colors.ink,
  },
  meta: {
    marginTop: Space.xs,
    ...typeStyle("secondary"),
    color: Colors.muted,
  },
  error: {
    ...typeStyle("secondary"),
    color: Colors.red,
  },
});
