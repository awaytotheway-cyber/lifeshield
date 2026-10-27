import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { IconButton, PrimaryButton, TextButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Screen } from "@/components/ui/Screen";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { Surface } from "@/components/ui/Surface";
import { TwoTone, type TwoTonePart } from "@/components/ui/TwoTone";
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
import { colors, radius, spacing, status } from "@/lib/design-tokens";
import {
  FEATURE_FLAG_DEFAULTS,
  isFeatureEnabled,
  type FeatureFlagProfile,
} from "@/lib/feature-flags";
import { routes } from "@/lib/routes";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { fontFamily, typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";

type LoadState = "idle" | "loading" | "ready" | "error";

/** Failure text borrows the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

/** How far back the screen asks for. Passed explicitly so the run below can
 * say honestly how much history it was allowed to see. */
const WINDOW_DAYS = 14;

/**
 * The longest run this screen is entitled to claim.
 *
 * `loadRecentActivity` filters on `recorded_at >= now - WINDOW_DAYS`, and a
 * manual reading is stamped at midnight UTC of its day, so whether the oldest
 * day in the window clears the cutoff depends on the hour the screen is
 * opened. 13 is the number of days that are always inside it. A run that
 * reaches this length may well be longer — the lede says so rather than the
 * headline printing 13 as if it were the whole truth.
 */
const PROVABLE_DAYS = 13;

/** Days of history drawn as the strip under the headline. */
const STRIP_DAYS = 7;

/**
 * Counted in words, the way the boards say it. A numeral in a headline reads
 * as a measurement of something; the readings themselves are the numerals.
 */
const COUNT_WORDS = [
  "No",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
];

function counted(value: number): string {
  return value < COUNT_WORDS.length ? COUNT_WORDS[value] : String(value);
}

/** Sunday-first, to index straight off `Date.getDay()`. */
const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

/** Where the readings came from, as the micro eyebrow beside the way back. */
const EYEBROW_TODAY = "Today";
const EYEBROW_WEEK = "Last seven days";
const EYEBROW_RECENT = "Recent readings";

/**
 * The day a reading belongs to, as YYYY-MM-DD in UTC.
 *
 * `bucketDaily` keys every bucket off `recorded_at.slice(0, 10)` — the UTC
 * day of the stored timestamp — and a manual entry is written as midnight UTC
 * of the day the person picked. The strip, the run and the today-per-kind map
 * all read this one clock, so the three can never disagree about which day a
 * reading landed on.
 */
function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** The same instant, a whole number of UTC days earlier. */
function minusDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() - days);
  return next;
}

/**
 * Consecutive days, counting back from today, carrying at least one reading.
 *
 * A day with nothing on it yet is not a broken run: if today is empty the
 * count starts at yesterday, so opening the app in the morning does not
 * report the run as zero. `capped` is true when the run reaches as far back
 * as the loaded window proves, meaning the real run may be longer.
 *
 * This is a count of days logged. It is deliberately not the goal streak:
 * `computeDailyStreak` in lib/goals.ts counts days that *hit a target*, is
 * defined per goal, and is what the goal screens show. Nothing here changes
 * or re-implements it.
 */
function loggedRun(
  loggedDays: ReadonlySet<string>,
  now: Date,
): { run: number; capped: boolean } {
  let cursor = new Date(now);
  if (!loggedDays.has(utcDay(cursor))) {
    cursor = minusDays(cursor, 1);
  }
  let run = 0;
  while (run < PROVABLE_DAYS && loggedDays.has(utcDay(cursor))) {
    run += 1;
    cursor = minusDays(cursor, 1);
  }
  return { run, capped: run === PROVABLE_DAYS };
}

/**
 * What the headline says before the rows arrive, and if they never do. A run
 * of zero is a claim about the person's week; until the readings are in hand
 * the screen has not earned it.
 */
const PENDING_HEADLINE: TwoTonePart[] = [
  { text: "Your", tone: "bold" },
  { text: " daily ", tone: "grey" },
  { text: "readings", tone: "bold" },
];

/** The headline. One sentence, two tones, and never a number it cannot prove. */
function headlineFor(run: number): TwoTonePart[] {
  if (run === 0) {
    return [
      { text: "Nothing", tone: "bold" },
      { text: " logged ", tone: "grey" },
      { text: "yet", tone: "bold" },
    ];
  }
  if (run === 1) {
    return [
      { text: "Day one", tone: "bold" },
      { text: " of a new ", tone: "grey" },
      { text: "run", tone: "bold" },
    ];
  }
  return [
    { text: counted(run), tone: "bold" },
    { text: " days in a ", tone: "grey" },
    { text: "row", tone: "bold" },
  ];
}

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

      void loadRecentActivity(userId, WINDOW_DAYS).then((outcome) => {
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

  const buckets = useMemo(() => bucketDaily(snapshots), [snapshots]);

  // Today's bucket per kind — first entry in the newest-first list per
  // (kind) is what the rows want.
  const todayByKind = useMemo(() => {
    const map = new Map<ActivityKind, DailyBucket>();
    const todayYmd = utcDay(new Date());
    for (const bucket of buckets) {
      if (map.has(bucket.kind)) continue;
      // First (newest) bucket wins; only mark it as "today" when the date
      // matches so a stale reading doesn't misrender as today's number.
      if (bucket.date === todayYmd) {
        map.set(bucket.kind, bucket);
      }
    }
    return map;
  }, [buckets]);

  /** Every day in the window that carries a reading of any kind. */
  const loggedDays = useMemo(
    () => new Set(buckets.map((bucket) => bucket.date)),
    [buckets],
  );

  const { run, capped } = useMemo(
    () => loggedRun(loggedDays, new Date()),
    [loggedDays],
  );

  /** The strip: the last seven days, oldest first, today last. */
  const week = useMemo(() => {
    const now = new Date();
    return Array.from({ length: STRIP_DAYS }, (_, index) => {
      const date = minusDays(now, STRIP_DAYS - 1 - index);
      const key = utcDay(date);
      return {
        key,
        initial: DAY_INITIALS[date.getUTCDay()],
        logged: loggedDays.has(key),
        isToday: index === STRIP_DAYS - 1,
      };
    });
  }, [loggedDays]);

  const recentActivityRows = useMemo(
    () => snapshots.slice(0, 10),
    [snapshots],
  );

  if (!session) return <Redirect href={routes.login} />;

  if (!enabled) {
    return (
      <Screen scroll contentPadding={spacing.screenX} centered={false}>
        <View style={styles.topRow}>
          <IconButton
            icon="arrow-left"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.back}
          />
        </View>
        <EmptyState
          heading="Activity tracking is coming soon"
          explanation="This feature is behind a flag while we test it with a small group. Ask us to switch it on for your account."
        />
      </Screen>
    );
  }

  const ready = state === "ready";
  const loggedKinds = todayByKind.size;
  const remaining = ALL_KINDS.length - loggedKinds;
  const weekLogged = week.filter((day) => day.logged).length;

  const lede = [
    remaining > 0
      ? `${counted(remaining)} of ${counted(ALL_KINDS.length).toLowerCase()} still to log today.`
      : "Everything tracked is logged for today.",
    capped
      ? "The run may be longer — this screen reads the last two weeks only."
      : null,
  ]
    .filter((sentence): sentence is string => Boolean(sentence))
    .join(" ");

  return (
    <Screen scroll contentPadding={spacing.screenX} centered={false}>
      <View style={styles.topRow}>
        <IconButton
          icon="arrow-left"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          // Pulled out to the gutter so the glyph, not its 44pt hit area,
          // lines up with the headline under it.
          style={styles.back}
        />
        <TextButton
          title="Connect health sources"
          onPress={() => router.push(routes.activitySources)}
          style={styles.topLink}
        />
      </View>

      <View accessibilityRole="header" style={styles.headline}>
        <TwoTone size="xl" parts={ready ? headlineFor(run) : PENDING_HEADLINE} />
      </View>

      {ready ? <Text style={styles.lede}>{lede}</Text> : null}

      {state === "loading" ? <StaticSkeleton rows={3} /> : null}

      {state === "error" && errorMessage ? (
        <Surface style={styles.errorCard}>
          <Text style={styles.errorHeading}>Couldn't load activity</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
        </Surface>
      ) : null}

      {ready ? (
        <>
          <Text style={styles.eyebrow}>{EYEBROW_WEEK}</Text>
          {/*
            One bar per day: a `mossMid` fill where something was logged, the
            `hairline` track where nothing was. Today, still open, is outlined
            rather than filled — an empty day and an unfinished one are not
            the same thing. The strip says only whether a reading exists,
            which is the one fact seven days of loaded rows can prove.
          */}
          <View
            style={styles.week}
            accessible
            accessibilityLabel={`Last seven days, ${counted(
              weekLogged,
            ).toLowerCase()} with a reading.`}
          >
            {week.map((day) => (
              <View key={day.key} style={styles.dayCell}>
                <Text
                  style={[
                    styles.dayInitial,
                    day.isToday ? styles.dayInitialToday : null,
                  ]}
                >
                  {day.initial}
                </Text>
                <View
                  style={[
                    styles.dayBar,
                    day.logged ? styles.dayBarLogged : null,
                    day.isToday && !day.logged ? styles.dayBarToday : null,
                  ]}
                />
              </View>
            ))}
          </View>
        </>
      ) : null}

      {ready && snapshots.length === 0 ? (
        <EmptyState
          heading="Nothing tracked yet"
          explanation="Log your first reading below, or connect HealthKit / Google Fit when the bridge lands."
        />
      ) : null}

      {ready ? (
        <>
          <Text style={styles.eyebrow}>{EYEBROW_TODAY}</Text>
          {/* One card, rows inside it — not a card per reading. */}
          <Surface padded={false} style={styles.rows}>
            {ALL_KINDS.map((kind, index) => (
              <KindRow
                key={kind}
                kind={kind}
                bucket={todayByKind.get(kind) ?? null}
                divider={index < ALL_KINDS.length - 1}
              />
            ))}
          </Surface>
        </>
      ) : null}

      {recentActivityRows.length > 0 ? (
        <>
          <Text style={styles.eyebrow}>{EYEBROW_RECENT}</Text>
          <Surface padded={false} style={styles.rows}>
            {recentActivityRows.map((snapshot, index) => (
              <RecentRow
                key={snapshot.id}
                snapshot={snapshot}
                divider={index < recentActivityRows.length - 1}
              />
            ))}
          </Surface>
        </>
      ) : null}

      <PrimaryButton
        title="Log a reading"
        onPress={() => router.push(routes.activityLog)}
      />
    </Screen>
  );
}

/**
 * One tracked reading as a row: its name, today's number, and how that number
 * stands against the default target.
 *
 * There is no tick box. The board's habit rows are binary — done or not —
 * and these are measurements: "8,214 steps" has no checked state, and a
 * control that looked tickable would have nothing to write. The progress fill
 * carries the same information honestly.
 */
function KindRow({
  kind,
  bucket,
  divider,
}: {
  kind: ActivityKind;
  bucket: DailyBucket | null;
  divider: boolean;
}) {
  const value = bucket?.total ?? 0;
  const target = DEFAULT_TARGETS[kind];
  const percent = target > 0 ? targetPercent(kind, value, target) : 0;
  const direction = targetDirection(kind);

  // The same sentences the summary card printed before the rebuild — the
  // numbers and their wording are the logic's, not the layout's.
  const meta =
    target > 0
      ? direction === "higher_better"
        ? `${percent}% of ${formatValue(kind, target)}`
        : `${percent}% (target ≤ ${formatValue(kind, target)})`
      : "No target set";

  return (
    <View style={[styles.row, divider ? styles.divided : null]}>
      <View style={styles.rowHead}>
        <Text style={styles.rowName}>{KIND_LABELS[kind]}</Text>
        <Text
          style={styles.rowValue}
          accessibilityLabel={
            bucket ? formatValue(kind, value) : "Nothing logged today"
          }
        >
          {bucket ? formatValue(kind, value) : "—"}
        </Text>
      </View>
      {target > 0 ? <ProgressBar current={percent} total={100} /> : null}
      <Text style={styles.rowMeta}>{meta}</Text>
    </View>
  );
}

function RecentRow({
  snapshot,
  divider,
}: {
  snapshot: ActivitySnapshot;
  divider: boolean;
}) {
  const day = snapshot.recorded_at.slice(0, 10);
  const formatted = formatValue(snapshot.kind, snapshot.value);
  return (
    <View
      style={[styles.recentRow, divider ? styles.divided : null]}
      accessible
      accessibilityLabel={`${KIND_LABELS[snapshot.kind]}, ${formatted}, ${day}, from ${snapshot.source}`}
    >
      <View style={styles.recentText}>
        <Text style={styles.rowName}>{KIND_LABELS[snapshot.kind]}</Text>
        <Text style={styles.rowMeta}>{`${day} · ${snapshot.source}`}</Text>
      </View>
      <Text style={styles.rowValue}>{formatted}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: {
    marginLeft: -12,
  },
  // The link button carries its own 8pt lead and 8pt of side padding for the
  // 44pt target; both are taken back so it sits on the row and in the gutter.
  topLink: {
    marginTop: 0,
    marginRight: -8,
  },
  headline: {
    marginTop: 8,
  },
  lede: {
    marginTop: 12,
    ...typography.body,
    color: colors.inkSoft,
  },
  eyebrow: {
    marginTop: 22,
    ...typography.micro,
    color: colors.inkMuted,
  },
  week: {
    marginTop: 8,
    flexDirection: "row",
    gap: 6,
  },
  dayCell: {
    flex: 1,
  },
  dayInitial: {
    ...typography.micro,
    color: colors.inkMuted,
    textAlign: "center",
  },
  dayInitialToday: {
    color: colors.ink,
  },
  dayBar: {
    marginTop: 7,
    height: 34,
    borderRadius: radius.control,
    backgroundColor: colors.hairline,
  },
  dayBarLogged: {
    backgroundColor: colors.mossMid,
  },
  // Today is outlined, not filled: the day is not over.
  dayBarToday: {
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  rows: {
    marginTop: 8,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  row: {
    paddingVertical: 14,
  },
  divided: {
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  rowHead: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 14,
  },
  rowName: {
    flex: 1,
    // Without this the name's own width wins and pushes the number off the row.
    minWidth: 0,
    fontFamily: fontFamily.bodySemi,
    fontSize: 16,
    lineHeight: 21,
    color: colors.ink,
  },
  rowValue: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 16,
    lineHeight: 21,
    color: colors.ink,
  },
  rowMeta: {
    marginTop: 6,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 68,
    paddingVertical: 12,
  },
  recentText: {
    flex: 1,
    minWidth: 0,
  },
  errorCard: {
    marginTop: 16,
  },
  errorHeading: {
    ...typography.title,
    color: CLAY,
  },
  errorBody: {
    marginTop: 6,
    ...typography.body,
    color: colors.inkSoft,
  },
});
