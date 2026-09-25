import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { AnnouncementBar } from "@/components/ui/AnnouncementBar";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { OrangeStatPanel } from "@/components/ui/OrangeStatPanel";
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
import { colors, spacing } from "@/lib/design-tokens";
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

  const stepsBucket = todayByKind.get("steps") ?? null;
  const activeBucket = todayByKind.get("active_minutes") ?? null;
  const sleepBucket = todayByKind.get("sleep_minutes") ?? null;

  return (
    <Screen scroll contentPadding={0}>
      <AnnouncementBar message="clinical activity dossier · daily log" />

      <View style={styles.body}>
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
            <MonoLabel size={12}>Error</MonoLabel>
            <Text style={styles.errorHeading}>Couldn&apos;t load activity</Text>
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
      </View>

      {snapshots.length > 0 ? (
        <OrangeStatPanel
          stats={[
            {
              label: "steps today",
              value: pixelValue(stepsBucket?.total ?? 0, 0),
            },
            {
              label: "active min",
              value: pixelValue(activeBucket?.total ?? 0, 0),
            },
            {
              label: "sleep hrs",
              value: pixelValue((sleepBucket?.total ?? 0) / 60, 1),
            },
          ]}
        />
      ) : null}

      <View style={styles.body}>
        <MonoLabel size={12} style={styles.sectionLabel}>
          Today · summary
        </MonoLabel>
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
            <MonoLabel size={12} style={styles.sectionLabel}>
              Recent readings
            </MonoLabel>
            <FlatList
              data={recentActivityRows}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <RecentRow snapshot={item} />}
              ItemSeparatorComponent={() => <View style={styles.divider} />}
            />
          </>
        ) : null}
      </View>
    </Screen>
  );
}

function pixelValue(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return "—";
  if (decimals === 0) {
    if (value >= 10_000) return `${Math.round(value / 1000)}k`;
    return String(Math.round(value));
  }
  return value.toFixed(decimals);
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
      <MonoLabel size={11}>{KIND_LABELS[kind]}</MonoLabel>
      <Text style={styles.tileValue}>
        {bucket ? formatValue(kind, value) : "—"}
      </Text>
      {target > 0 ? (
        <>
          <ProgressBar current={percent} total={100} />
          <MonoLabel size={11} color={colors.ironGray} style={styles.tileTarget}>
            {direction === "higher_better"
              ? `${percent}% of ${formatValue(kind, target)}`
              : `${percent}% target ≤ ${formatValue(kind, target)}`}
          </MonoLabel>
        </>
      ) : (
        <MonoLabel size={11} color={colors.ironGray} style={styles.tileTarget}>
          No target set
        </MonoLabel>
      )}
    </GlassCard>
  );
}

function RecentRow({ snapshot }: { snapshot: ActivitySnapshot }) {
  const date = snapshot.recorded_at.slice(0, 10);
  return (
    <View style={styles.recentRow}>
      <MonoLabel size={11} style={styles.recentDate}>
        {date}
      </MonoLabel>
      <Text style={styles.recentKind}>{KIND_LABELS[snapshot.kind]}</Text>
      <Text style={styles.recentValue}>
        {formatValue(snapshot.kind, snapshot.value)}
      </Text>
      <MonoLabel size={10} color={colors.ironGray}>
        {snapshot.source}
      </MonoLabel>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.screenX,
  },
  actionRow: {
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  skeletons: { gap: spacing.sm },
  errorCard: {
    marginTop: spacing.md,
    padding: spacing.base,
  },
  errorHeading: {
    fontFamily: fontFamily.groteskBold,
    fontSize: 21,
    color: colors.inkBlack,
    marginTop: spacing.micro,
    marginBottom: spacing.sm,
  },
  errorBody: {
    fontFamily: fontFamily.grotesk,
    fontSize: 15,
    color: colors.ironGray,
  },
  sectionLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
    // Grid cells share a hairline — set border on the tile directly.
  },
  tile: {
    flexBasis: "50%",
    flexGrow: 0,
    padding: spacing.base,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: colors.inkBlack,
    marginLeft: -1,
    marginBottom: -1,
  },
  tileValue: {
    fontFamily: fontFamily.groteskBold,
    fontSize: 26,
    color: colors.inkBlack,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  tileTarget: {
    marginTop: spacing.sm,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.smoke,
    backgroundColor: colors.paperWhite,
    gap: spacing.sm,
  },
  divider: {
    height: 0,
  },
  recentDate: {
    minWidth: 90,
  },
  recentKind: {
    flex: 1,
    fontFamily: fontFamily.grotesk,
    fontSize: 14,
    color: colors.inkBlack,
  },
  recentValue: {
    fontFamily: fontFamily.groteskBold,
    fontSize: 14,
    color: colors.inkBlack,
    marginRight: spacing.sm,
  },
});

