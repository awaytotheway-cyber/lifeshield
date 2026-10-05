import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ProgressBar } from "@/components/ui/ProgressBar";
import { COPY } from "@/lib/copy";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import { goalDetailHref, routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
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
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{COPY.goalsHomeHeader}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(routes.goals)}
        >
          <Text style={styles.link}>{COPY.goalsHomeSeeAll}</Text>
        </Pressable>
      </View>

      {active.length === 0 ? (
        <>
          <Text style={styles.empty}>{COPY.goalsEmptyBody}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(routes.newGoal)}
          >
            <Text style={styles.cta}>{COPY.goalsNewCta}</Text>
          </Pressable>
        </>
      ) : (
        active.map((row) => (
          <Pressable
            key={row.id}
            accessibilityRole="button"
            accessibilityLabel={`${row.title}, ${progressPercent(row)}% progress`}
            onPress={() => router.push(goalDetailHref(row.id))}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Text style={styles.type}>{goalTypeLabel(row.goal_type)}</Text>
            <Text style={styles.rowTitle}>{row.title}</Text>
            <ProgressBar current={row.progress} total={row.target} />
            <Text style={styles.meta}>
              {row.progress} / {row.target} {row.unit} · ends {row.end_date}
            </Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.base,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.base,
    ...shadows.card,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 18,
    lineHeight: 24,
    color: colors.charcoal,
  },
  link: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
    color: colors.primaryBlue,
  },
  empty: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.slate,
    marginBottom: spacing.sm,
  },
  cta: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    color: colors.primaryBlue,
  },
  row: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowPressed: {
    opacity: 0.85,
  },
  type: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.2,
    color: colors.slate,
  },
  rowTitle: {
    marginTop: spacing.micro,
    marginBottom: spacing.micro,
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    color: colors.charcoal,
  },
  meta: {
    marginTop: spacing.micro,
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.slate,
  },
});
