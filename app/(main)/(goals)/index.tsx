import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import {
  FEATURE_FLAG_DEFAULTS,
  isFeatureEnabled,
  type FeatureFlagProfile,
} from "@/lib/feature-flags";
import { computeDailyStreak, computeProgress, type Goal } from "@/lib/goals";
import { loadGoals } from "@/lib/goals-io";
import { fontFamily } from "@/lib/typography";
import { goalHref, routes } from "@/lib/routes";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";

type LoadState = "idle" | "loading" | "ready" | "error";

export default function GoalsScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);

  const [state, setState] = useState<LoadState>("idle");
  const [rows, setRows] = useState<Goal[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<FeatureFlagProfile | null>(null);

  const userId = session?.user.id ?? null;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!userId) return;
      setState("loading");
      setErrorMessage(null);

      // Read the profile's feature flag overrides so the gate below is fresh
      // each time the screen focuses (a beta flip should light up on next
      // navigation, no relaunch needed).
      if (isSupabaseConfigured) {
        void supabase
          .from("profiles")
          .select("feature_flags")
          .eq("id", userId)
          .maybeSingle()
          .then(({ data }) => {
            if (cancelled) return;
            setProfile((data ?? { feature_flags: {} }) as FeatureFlagProfile);
          });
      } else {
        setProfile({ feature_flags: {} });
      }

      void loadGoals(userId).then((outcome) => {
        if (cancelled) return;
        if (outcome.ok) {
          setRows(outcome.rows);
          setState("ready");
        } else {
          setErrorMessage(outcome.message);
          setState("error");
        }
      });
      return () => {
        cancelled = true;
      };
    }, [userId]),
  );

  // While the profile lookup is in flight, fall back to the compile-time default
  // so we never render the gated content by accident.
  const enabled =
    profile === null ? FEATURE_FLAG_DEFAULTS.goals_v1 : isFeatureEnabled(profile, "goals_v1");

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (!enabled) {
    return (
      <Screen scroll>
        <ScreenHeader title="Goals" onBack={() => router.back()} />
        <EmptyState
          icon="target"
          heading="Goals are coming soon"
          explanation="This feature is behind a flag while we test it with a small group. Ask us to switch it on for your account."
        />
      </Screen>
    );
  }

  const active = useMemo(
    () => rows.filter((row) => row.status === "active"),
    [rows],
  );
  const other = useMemo(
    () => rows.filter((row) => row.status !== "active"),
    [rows],
  );

  return (
    <Screen scroll>
      <ScreenHeader title="Goals" onBack={() => router.back()} />

      <PrimaryButton
        title="New goal"
        onPress={() => router.push(routes.goalsNew)}
      />

      {state === "loading" ? (
        <View style={styles.skeletons}>
          <StaticSkeleton rows={2} />
        </View>
      ) : null}

      {state === "error" && errorMessage ? (
        <GlassCard intensity="card" style={styles.errorCard}>
          <Text style={styles.errorHeading}>Couldn't load your goals</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
        </GlassCard>
      ) : null}

      {state === "ready" && rows.length === 0 ? (
        <EmptyState
          icon="target"
          heading="No goals yet"
          explanation="A goal is a small, measurable target — like 8k steps a day or 3 servings of veg. Tap New goal to set one up."
        />
      ) : null}

      {active.length > 0 ? (
        <View>
          <Text style={styles.sectionHeading}>Active</Text>
          <FlatList
            data={active}
            scrollEnabled={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <GoalCard goal={item} onOpen={() => router.push(goalHref(item.id))} />
            )}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          />
        </View>
      ) : null}

      {other.length > 0 ? (
        <View style={styles.other}>
          <Text style={styles.sectionHeading}>Paused &amp; completed</Text>
          <FlatList
            data={other}
            scrollEnabled={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <GoalCard
                goal={item}
                muted
                onOpen={() => router.push(goalHref(item.id))}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          />
        </View>
      ) : null}
    </Screen>
  );
}

function GoalCard({
  goal,
  muted,
  onOpen,
}: {
  goal: Goal;
  muted?: boolean;
  onOpen: () => void;
}) {
  // No stored progress yet on the list screen — show target + cadence.
  const progress = computeProgress(goal, [], new Date());
  const streak = computeDailyStreak(goal, [], new Date());
  return (
    <GlassCard intensity="card" style={[styles.card, muted ? styles.cardMuted : null]}>
      <Text style={styles.cadence}>{cadenceLabel(goal.target.cadence)}</Text>
      <Text style={styles.cardTitle}>{goal.title}</Text>
      <Text style={styles.target}>
        Target: {goal.target.value} {goal.target.unit} · started {goal.start_date}
      </Text>
      <ProgressBar current={progress.total} total={goal.target.value} />
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{progress.percent}% today</Text>
        {streak > 0 ? (
          <Text style={styles.metaText}>· {streak}-day streak</Text>
        ) : null}
      </View>
      <TextButton title="Open" onPress={onOpen} />
    </GlassCard>
  );
}

function cadenceLabel(cadence: "daily" | "weekly" | "once"): string {
  if (cadence === "daily") return "Daily";
  if (cadence === "weekly") return "Weekly";
  return "One-off";
}

const styles = StyleSheet.create({
  skeletons: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  errorCard: {
    marginTop: spacing.md,
    padding: spacing.base,
    borderRadius: radius.card,
    ...shadows.card,
  },
  errorHeading: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 16,
    color: colors.riskHigh,
    marginBottom: spacing.micro,
  },
  errorBody: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.slate,
  },
  sectionHeading: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 18,
    color: colors.deepNavy,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  card: {
    padding: spacing.base,
    borderRadius: radius.card,
    ...shadows.card,
  },
  cardMuted: {
    opacity: 0.75,
  },
  cadence: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    color: colors.primaryBlue,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.micro,
  },
  cardTitle: {
    fontFamily: fontFamily.display,
    fontSize: 18,
    color: colors.deepNavy,
    marginBottom: spacing.micro,
  },
  target: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.slate,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.micro,
    marginTop: spacing.micro,
    marginBottom: spacing.sm,
  },
  metaText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.slate,
  },
  other: {
    marginTop: spacing.md,
  },
});
