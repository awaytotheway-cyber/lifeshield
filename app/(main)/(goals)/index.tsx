import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import { goalDetailHref, routes } from "@/lib/routes";
import {
  goalTypeLabel,
  isOverdue,
  loadOwnGoals,
  progressPercent,
  statusLabel,
  type WeeklyGoalRow,
} from "@/lib/weekly-goals";
import { useAuthStore } from "@/stores/auth-store";
import { Accent, Edge, Ink, Measure, Paper, SpecimenType } from "@/lib/specimen-tokens";

type LoadState = "idle" | "loading" | "ready" | "error";

function GoalRow({
  row,
  onPress,
}: {
  row: WeeklyGoalRow;
  onPress: () => void;
}) {
  const pct = progressPercent(row);
  const overdue = isOverdue(row);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.title} — ${statusLabel(row.status)}, ${pct}% progress`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.rowTop}>
        <Text style={styles.type}>{goalTypeLabel(row.goal_type)}</Text>
        <Text style={[styles.status, statusColor(row)]}>
          {overdue ? COPY.goalsMissedLabel : statusLabel(row.status)}
        </Text>
      </View>
      <Text style={styles.title}>{row.title}</Text>
      <Text style={styles.meta}>
        {row.progress} / {row.target} {row.unit} · ends {row.end_date}
      </Text>
      <ProgressBar current={row.progress} total={row.target} />
    </Pressable>
  );
}

function statusColor(row: WeeklyGoalRow) {
  if (isOverdue(row)) return { color: Accent.tag };
  switch (row.status) {
    case "completed":
      return { color: Accent.sage };
    case "missed":
      return { color: Accent.tag };
    case "cancelled":
      return { color: Ink.soft };
    default:
      return { color: Accent.tag };
  }
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
    <Screen contentPadding={Measure.gutter} centered={false}>
      <ScreenHeader
        title={COPY.goalsTitle}
        onBack={() => router.replace(routes.home)}
        backLabel={COPY.orderBackHome}
      />
      <Text style={styles.body}>{COPY.goalsSubtitle}</Text>

      <View style={styles.ctaWrap}>
        <PrimaryButton
          title={COPY.goalsNewCta}
          onPress={() => router.push(routes.newGoal)}
        />
      </View>

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
        <FlatList
          data={rows}
          keyExtractor={(row) => row.id}
          renderItem={({ item }) => (
            <GoalRow row={item} onPress={() => router.push(goalDetailHref(item.id))} />
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: Measure.tight,
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    lineHeight: 24,
    color: Ink.soft,
  },
  ctaWrap: {
    marginTop: Measure.base,
    marginBottom: Measure.base,
  },
  card: {
    backgroundColor: Paper.mount,
    borderRadius: Edge.mount,
    padding: Measure.base,
  },
  cardPressed: {
    opacity: 0.85,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Measure.tight,
  },
  type: {
    fontFamily: SpecimenType.mono,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.4,
    color: Ink.soft,
    textTransform: "uppercase",
  },
  status: {
    fontFamily: SpecimenType.monoBold,
    fontSize: 14,
    lineHeight: 18,
  },
  title: {
    fontFamily: SpecimenType.serif,
    fontSize: 18,
    lineHeight: 24,
    color: Ink.full,
  },
  meta: {
    marginTop: Measure.hair,
    marginBottom: Measure.tight,
    fontFamily: SpecimenType.mono,
    fontSize: 15,
    lineHeight: 20,
    color: Ink.soft,
  },
  sep: {
    height: Measure.snug,
  },
  error: {
    marginTop: Measure.base,
    fontFamily: SpecimenType.mono,
    color: Accent.tag,
  },
});
