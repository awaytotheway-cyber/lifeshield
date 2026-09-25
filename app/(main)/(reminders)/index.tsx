import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import {
  FEATURE_FLAG_DEFAULTS,
  isFeatureEnabled,
  type FeatureFlagProfile,
} from "@/lib/feature-flags";
import { scheduleLabel, type Reminder } from "@/lib/reminders";
import { loadReminders } from "@/lib/reminders-io";
import { fontFamily } from "@/lib/typography";
import { reminderHref, routes } from "@/lib/routes";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";

type LoadState = "idle" | "loading" | "ready" | "error";

export default function RemindersScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const userId = session?.user.id ?? null;

  const [state, setState] = useState<LoadState>("idle");
  const [rows, setRows] = useState<Reminder[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<FeatureFlagProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      setState("loading");
      setErrorMessage(null);

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

      void loadReminders(userId).then((outcome) => {
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

  const enabled =
    profile === null
      ? FEATURE_FLAG_DEFAULTS.reminders_v1
      : isFeatureEnabled(profile, "reminders_v1");

  if (!session) return <Redirect href={routes.login} />;

  if (!enabled) {
    return (
      <Screen scroll>
        <ScreenHeader title="Reminders" onBack={() => router.back()} />
        <EmptyState
          icon="clock"
          heading="Reminders are coming soon"
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
      <ScreenHeader title="Reminders" onBack={() => router.back()} />

      <PrimaryButton
        title="New reminder"
        onPress={() => router.push(routes.remindersNew)}
      />

      {state === "loading" ? (
        <View style={styles.skeletons}>
          <StaticSkeleton rows={2} />
        </View>
      ) : null}

      {state === "error" && errorMessage ? (
        <GlassCard intensity="card" style={styles.errorCard}>
          <Text style={styles.errorHeading}>Couldn't load reminders</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
        </GlassCard>
      ) : null}

      {state === "ready" && rows.length === 0 ? (
        <EmptyState
          icon="clock"
          heading="No reminders yet"
          explanation="Set a reminder for anything you want to remember — a supplement, a walk, a follow-up call. Reminders fire as local notifications on this device."
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
              <ReminderCard
                reminder={item}
                onOpen={() => router.push(reminderHref(item.id))}
              />
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
              <ReminderCard
                reminder={item}
                muted
                onOpen={() => router.push(reminderHref(item.id))}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          />
        </View>
      ) : null}
    </Screen>
  );
}

function ReminderCard({
  reminder,
  muted,
  onOpen,
}: {
  reminder: Reminder;
  muted?: boolean;
  onOpen: () => void;
}) {
  const nextLabel =
    reminder.next_fire_at && reminder.status === "active"
      ? new Date(reminder.next_fire_at).toLocaleString()
      : null;
  return (
    <GlassCard intensity="card" style={[styles.card, muted ? styles.cardMuted : null]}>
      <Text style={styles.cadence}>{scheduleLabel(reminder)}</Text>
      <Text style={styles.cardTitle}>{reminder.title}</Text>
      {reminder.body ? (
        <Text style={styles.body}>{reminder.body}</Text>
      ) : null}
      {nextLabel ? (
        <Text style={styles.next}>Next: {nextLabel}</Text>
      ) : null}
      <TextButton title="Open" onPress={onOpen} />
    </GlassCard>
  );
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
  body: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.slate,
    marginBottom: spacing.sm,
  },
  next: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.slate,
    marginBottom: spacing.sm,
  },
  other: {
    marginTop: spacing.md,
  },
});
