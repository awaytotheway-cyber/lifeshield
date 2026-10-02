import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Card } from "@/components/ui/Card";
import { PressScale } from "@/components/ui/PressScale";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TextButton } from "@/components/ui/Button";
import { COPY } from "@/lib/copy";
import { Colors, Font, Gap, Space, typeStyle } from "@/lib/theme";
import { goalDetailHref, routes } from "@/lib/routes";
import {
  activeGoals,
  goalTypeLabel,
  loadOwnGoals,
  progressPercent,
  type WeeklyGoalRow,
} from "@/lib/weekly-goals";

type GoalsSummaryCardProps = {
  userId: string;
  /** Compact Home version shows at most this many rows. */
  maxRows?: number;
};

/**
 * Compact list of the user's active weekly goals for the Home screen.
 * If the backend table is missing, the card silently renders nothing so
 * Home never breaks for people who haven't run the migration yet.
 */
export function GoalsSummaryCard({ userId, maxRows = 2 }: GoalsSummaryCardProps) {
  const router = useRouter();
  const [rows, setRows] = useState<WeeklyGoalRow[] | null>(null);
  const [hidden, setHidden] = useState(false);

  const load = useCallback(async () => {
    const result = await loadOwnGoals(userId);
    if (!result.ok) {
      if (result.message === COPY.goalsNeedSql) {
        setHidden(true);
      }
      setRows([]);
      return;
    }
    setRows(result.rows);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (hidden) return null;
  if (rows === null) return null;

  const active = activeGoals(rows).slice(0, maxRows);

  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.title}>{COPY.goalsHomeHeader}</Text>
        <TextButton
          title={COPY.goalsHomeSeeAll}
          style={styles.headerLink}
          onPress={() => router.push(routes.goals)}
        />
      </View>

      {active.length === 0 ? (
        <>
          <Text style={styles.empty}>{COPY.goalsEmptyBody}</Text>
          <TextButton
            title={COPY.goalsNewCta}
            style={styles.emptyCta}
            onPress={() => router.push(routes.newGoal)}
          />
        </>
      ) : (
        active.map((row) => (
          <PressScale
            key={row.id}
            accessibilityRole="button"
            accessibilityLabel={`${row.title}, ${progressPercent(row)}% progress`}
            onPress={() => router.push(goalDetailHref(row.id))}
            haptic="light"
            style={styles.row}
          >
            <Text style={styles.type}>{goalTypeLabel(row.goal_type)}</Text>
            <Text style={styles.rowTitle}>{row.title}</Text>
            <ProgressBar current={row.progress} total={row.target} />
            <Text style={styles.meta}>
              {row.progress} / {row.target} {row.unit} · ends {row.end_date}
            </Text>
          </PressScale>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Space.sm,
  },
  title: {
    flex: 1,
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  headerLink: {
    marginTop: 0,
    width: "auto",
  },
  empty: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
  },
  emptyCta: {
    alignSelf: "flex-start",
    paddingHorizontal: 0,
  },
  row: {
    marginTop: Gap.rowY,
    paddingTop: Gap.rowY,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.line,
  },
  type: {
    ...typeStyle("label"),
    color: Colors.muted,
  },
  rowTitle: {
    marginTop: Space.xs,
    fontFamily: Font.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.ink,
  },
  meta: {
    ...typeStyle("secondary"),
    marginTop: Space.sm,
    color: Colors.muted,
  },
});
