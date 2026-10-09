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
import {
  ALL_KINDS,
  bucketDaily,
  DEFAULT_TARGETS,
  KIND_LABELS,
  formatValue,
  targetDirection,
  targetPercent,
  type ActivityKind,
  type ActivitySnapshot,
  type DailyBucket,
} from "@/lib/activity";
import { loadRecentActivity } from "@/lib/activity-io";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import {
  FEATURE_FLAG_DEFAULTS,
  isFeatureEnabled,
  type FeatureFlagProfile,
} from "@/lib/feature-flags";
import { routes } from "@/lib/routes";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";

type LoadState = "idle" | "loading" | "ready" | "error";

export default function ActivityScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const userId = session?.user.id ?? null;

  const [state, setState] = useState<LoadState>("idle");
  const [snapshots, setSnapshots] = useState<ActivitySnapshot[]>([]);
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

      void loadRecentActivity(userId).then((outcome) => {
        if (cancelled) return;
        if (outcome.ok) {
          setSnapshots(outcome.rows);
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
      ? FEATURE_FLAG_DEFAULTS.activity_v1
      : isFeatureEnabled(profile, "activity_v1");

  // Today's bucket per kind — first entry in the newest-first list per
  // (kind) is what the summary card wants.
  const todayByKind = useMemo(() => {
    const buckets = bucketDaily(snapshots);
    const map = new Map<ActivityKind, DailyBucket>();
    const todayYmd = new Date().toISOString().slice(0, 10);
    for (const bucket of buckets) {
      if (map.has(bucket.kind)) continue;
      // First (newest) bucket wins; only mark it as "today" when the date
      // matches so a stale reading doesn't misrender as today's number.
      if (bucket.date === todayYmd) {
        map.set(bucket.kind, bucket);
      }
    }
    return map;
  }, [snapshots]);

  const recentActivityRows = useMemo(
    () => snapshots.slice(0, 10),
    [snapshots],
  );

  if (!session) return <Redirect href={routes.login} />;

  if (!enabled) {
    return (
      <Screen scroll>
        <ScreenHeader title="Activity" onBack={() => router.back()} />
        <EmptyState
          icon="activity"
          heading="Activity tracking is coming soon"
          explanation="This feature is behind a flag while we test it with a small group. Ask us to switch it on for your account."
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader title="Activity" onBack={() => router.back()} />

      <View style={styles.actionRow}>
        <PrimaryButton
          title="Log a reading"
          onPress={() => router.push(routes.activityLog)}
        />
        <TextButton
          title="Connect health sources"
          onPress={() => router.push(routes.activitySources)}
        />
      </View>

      {state === "loading" ? (
        <View style={styles.skeletons}>
          <StaticSkeleton rows={3} />
        </View>
      ) : null}

      {state === "error" && errorMessage ? (
        <GlassCard intensity="card" style={styles.errorCard}>
          <Text style={styles.errorHeading}>Couldn't load activity</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
        </GlassCard>
      ) : null}

      {state === "ready" && snapshots.length === 0 ? (
        <EmptyState
          icon="activity"
          heading="Nothing tracked yet"
          explanation="Log your first reading below, or connect HealthKit / Google Fit when the bridge lands."
        />
      ) : null}

      <Text style={styles.sectionHeading}>Today</Text>
      <View style={styles.summaryGrid}>
        {ALL_KINDS.map((kind) => (
          <SummaryTile
            key={kind}
            kind={kind}
            bucket={todayByKind.get(kind) ?? null}
          />
        ))}
      </View>

      {recentActivityRows.length > 0 ? (
        <>
          <Text style={styles.sectionHeading}>Recent readings</Text>
          <FlatList
            data={recentActivityRows}
            scrollEnabled={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <RecentRow snapshot={item} />}
            ItemSeparatorComponent={() => (
              <View style={{ height: spacing.micro }} />
            )}
          />
        </>
      ) : null}
    </Screen>
  );
}

function SummaryTile({
  kind,
  bucket,
}: {
  kind: ActivityKind;
  bucket: DailyBucket | null;
}) {
  const value = bucket?.total ?? 0;
  const target = DEFAULT_TARGETS[kind];
  const percent = target > 0 ? targetPercent(kind, value, target) : 0;
  const direction = targetDirection(kind);
  return (
    <GlassCard intensity="card" style={styles.tile}>
      <Text style={styles.tileLabel}>{KIND_LABELS[kind]}</Text>
      <Text style={styles.tileValue}>
        {bucket ? formatValue(kind, value) : "—"}
      </Text>
      {target > 0 ? (
        <>
          <ProgressBar current={percent} total={100} />
          <Text style={styles.tileTarget}>
            {direction === "higher_better"
              ? `${percent}% of ${formatValue(kind, target)}`
              : `${percent}% (target ≤ ${formatValue(kind, target)})`}
          </Text>
        </>
      ) : (
        <Text style={styles.tileTarget}>No target set</Text>
      )}
    </GlassCard>
  );
}

function RecentRow({ snapshot }: { snapshot: ActivitySnapshot }) {
  const date = snapshot.recorded_at.slice(0, 10);
  return (
    <View style={styles.recentRow}>
      <Text style={styles.recentDate}>{date}</Text>
      <Text style={styles.recentKind}>{KIND_LABELS[snapshot.kind]}</Text>
      <Text style={styles.recentValue}>
        {formatValue(snapshot.kind, snapshot.value)}
      </Text>
      <Text style={styles.recentSource}>{snapshot.source}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  skeletons: { gap: spacing.sm },
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
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tile: {
    flexBasis: "48%",
    flexGrow: 1,
    padding: spacing.base,
    borderRadius: radius.card,
    ...shadows.card,
  },
  tileLabel: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    color: colors.slate,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.micro,
  },
  tileValue: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    color: colors.deepNavy,
    marginBottom: spacing.sm,
  },
  tileTarget: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.slate,
    marginTop: spacing.micro,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radius.card,
    backgroundColor: colors.glassChrome,
  },
  recentDate: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    color: colors.primaryBlue,
    minWidth: 90,
  },
  recentKind: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.charcoal,
  },
  recentValue: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
    color: colors.deepNavy,
    marginRight: spacing.sm,
  },
  recentSource: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: colors.slate,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

