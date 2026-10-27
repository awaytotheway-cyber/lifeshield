import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { IconButton, PrimaryButton, TextButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResultCard } from "@/components/ui/ResultCard";
import { Screen } from "@/components/ui/Screen";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { StatusChip } from "@/components/ui/StatusChip";
import { Surface } from "@/components/ui/Surface";
import { TwoTone, type TwoTonePart } from "@/components/ui/TwoTone";
import { COPY } from "@/lib/copy";
import { colors, spacing, status, tapTarget } from "@/lib/design-tokens";
import { getTerm } from "@/lib/plain-language";
import { resultDetailHref, routes } from "@/lib/routes";
import {
  loadOwnTestResults,
  meaningForFlag,
  mossStatusFromFlag,
  statusChipFromFlag,
  type TestResultRow,
} from "@/lib/test-results";
import { fontFamily, typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/** The one headline. `COPY.labResultsTitle` stays the name of the screen. */
const HEADLINE: TwoTonePart[] = [
  { text: "Your ", tone: "bold" },
  { text: "reports", tone: "grey" },
];

/** The lede, from the board: it says where the lab's own numbers went. */
const LEDE = "In plain words first. The lab's own numbers are inside each one.";

/**
 * The closing line, from the board. It is the screen's standing caveat, so it
 * sits under the list whatever the list holds.
 */
const FOOTNOTE =
  "Plain-language summaries are written to help you ask better questions. Only your practitioner can interpret a result.";

/**
 * The link out of the lead report, from the board. It says what is behind it
 * — the lab's own numbers — where `COPY.labResultsOpenDetail`'s "Read more"
 * only says there is more.
 */
const OPEN_FULL = "Open the full report";

/** Failure text borrows the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

/** The eyebrow date on the lead report: "14 October". */
function reportDate(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long" });
}

export default function LabResultsScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<TestResultRow[]>([]);

  const refresh = useCallback(async () => {
    if (!session?.user.id) {
      return;
    }
    setLoading(true);
    try {
      const result = await loadOwnTestResults(session.user.id);
      if (!result.ok) {
        setMessage(result.message);
        setRows([]);
      } else {
        setRows(result.rows);
        setMessage(null);
      }
    } catch {
      setMessage(COPY.labResultsLoadFailed);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user.id]);

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    void refresh();
  }, [session?.user.id, refresh]);

  /**
   * The same order the screen has always shown: anything worth watching or
   * needing attention first, then the rows that sit within range, each group
   * keeping the newest-first order it arrived in. The group headings are
   * gone — a chip on every row says which group it is in, and the headings
   * were saying it a second time.
   */
  const ordered = useMemo<TestResultRow[]>(() => {
    const watching = rows.filter((row) => {
      const tone = statusChipFromFlag(row.flag).tone;
      return tone === "worth_watching" || tone === "needs_attention";
    });
    const inRange = rows.filter((row) => {
      const tone = statusChipFromFlag(row.flag).tone;
      return tone === "within_range";
    });
    return [...watching, ...inRange];
  }, [rows]);

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  const hasRows = !loading && !message && ordered.length > 0;
  // The first of that order reads in full; the rest are rows. Nothing is
  // reordered to make a lead — the lead is whatever was already first.
  const lead = hasRows ? ordered[0] : null;
  const rest = hasRows ? ordered.slice(1) : [];

  return (
    <Screen scroll contentPadding={spacing.screenX} centered={false}>
      <View style={styles.topRow}>
        <IconButton
          icon="arrow-left"
          accessibilityLabel={COPY.resultsBackHome}
          onPress={() => router.replace(routes.home)}
          // Pulled out to the gutter so the glyph, not its 44pt hit area,
          // lines up with the headline under it.
          style={styles.back}
        />
      </View>

      <View accessibilityRole="header">
        <TwoTone size="xl" parts={HEADLINE} />
      </View>
      <Text style={styles.lede}>{LEDE}</Text>

      {loading ? <StaticSkeleton rows={4} /> : null}

      {message ? (
        <>
          <Text style={styles.error}>{message}</Text>
          <TextButton
            title={COPY.labResultsRetry}
            onPress={() => void refresh()}
          />
        </>
      ) : null}

      {!loading && !message && rows.length === 0 ? (
        <EmptyState
          heading={COPY.labResultsEmptyHeading}
          explanation={COPY.labResultsEmpty}
        />
      ) : null}

      {lead ? <LeadReport row={lead} /> : null}

      {rest.length > 0 ? (
        <Surface padded={false} style={styles.rows}>
          {rest.map((row, index) => {
            const term = getTerm(row.test_name);
            const chip = statusChipFromFlag(row.flag);
            return (
              <ResultCard
                key={row.id}
                plainName={row.plain_name?.trim() || term.plainName}
                meaning={meaningForFlag(row.flag)}
                status={mossStatusFromFlag(row.flag)}
                statusLabel={chip.label}
                onPress={() => {
                  router.push(resultDetailHref(row.id));
                }}
                divider={index < rest.length - 1}
              />
            );
          })}
        </Surface>
      ) : null}

      {hasRows ? (
        <>
          <Text style={styles.footnote}>{FOOTNOTE}</Text>
          <PrimaryButton
            title={COPY.labResultsSeePlan}
            onPress={() => {
              router.push(routes.plan);
            }}
          />
        </>
      ) : null}
    </Screen>
  );
}

/**
 * The first report, read in full: the date as a micro eyebrow, the plain name
 * as the card's title, the chip, what it means in everyday words, and the
 * lab's own number with the range it was read against.
 *
 * The board draws a track under the number with the usual range shaded and
 * the reading marked on it. That is not drawn here: the position of the mark
 * would have to be derived from `reference_range`, which the lab writes as
 * free text, and a range this code misread would put the mark in the wrong
 * place — a picture of a result that the number beside it contradicts. The
 * range is printed instead, exactly as the lab wrote it.
 */
function LeadReport({ row }: { row: TestResultRow }) {
  const router = useRouter();
  const term = getTerm(row.test_name);
  const chip = statusChipFromFlag(row.flag);
  const kind = mossStatusFromFlag(row.flag);
  const value = row.result_value?.trim();
  const unit = row.result_unit?.trim();
  const range = row.reference_range?.trim();

  const meta = [unit, range ? `${COPY.labResultRangeLabel} ${range}` : null]
    .filter((part): part is string => Boolean(part))
    .join(" · ");

  return (
    <Surface style={styles.lead}>
      <View style={styles.leadHead}>
        <View style={styles.leadHeadText}>
          <Text style={styles.eyebrow}>{reportDate(row.created_at)}</Text>
          <Text style={styles.leadName}>
            {row.plain_name?.trim() || term.plainName}
          </Text>
        </View>
        <View style={styles.chipSlot}>
          {kind ? (
            <StatusChip kind={kind} label={chip.label} />
          ) : (
            <Text style={styles.unflagged}>{chip.label}</Text>
          )}
        </View>
      </View>

      <Text style={styles.leadMeaning}>{meaningForFlag(row.flag)}</Text>

      {value ? (
        <View
          style={styles.valueRow}
          accessible
          accessibilityLabel={`${COPY.labResultValueLabel}: ${value} ${meta}`}
        >
          <Text style={styles.value}>{value}</Text>
          {meta ? <Text style={styles.valueMeta}>{meta}</Text> : null}
        </View>
      ) : (
        <Text style={styles.valueMissing}>{COPY.labResultNoValue}</Text>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={OPEN_FULL}
        onPress={() => {
          router.push(resultDetailHref(row.id));
        }}
        style={styles.openHit}
      >
        <Text style={styles.openText}>{OPEN_FULL}</Text>
      </Pressable>
    </Surface>
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
  lede: {
    marginTop: 12,
    ...typography.body,
    color: colors.inkSoft,
  },
  lead: {
    marginTop: 22,
  },
  leadHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  leadHeadText: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    ...typography.micro,
    color: colors.inkMuted,
  },
  leadName: {
    marginTop: 7,
    fontFamily: fontFamily.display,
    fontSize: 24,
    lineHeight: 26,
    letterSpacing: -0.5,
    color: colors.ink,
  },
  chipSlot: {
    paddingTop: 2,
  },
  unflagged: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.inkMuted,
  },
  leadMeaning: {
    marginTop: 14,
    ...typography.body,
    lineHeight: 24,
    color: colors.ink,
  },
  valueRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 12,
  },
  value: {
    ...typography.displayL,
    color: colors.ink,
  },
  valueMeta: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
  },
  valueMissing: {
    marginTop: 16,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
  },
  // An underlined link, which is the whole affordance — so it is always drawn.
  openHit: {
    marginTop: 10,
    minHeight: tapTarget,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  openText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 15,
    color: colors.ink,
    textDecorationLine: "underline",
  },
  rows: {
    marginTop: 14,
    paddingHorizontal: 20,
    // A pressed row fills with the paper ground, so the card has to clip it
    // to its own radius or the fill squares off the corners.
    overflow: "hidden",
  },
  footnote: {
    marginTop: 16,
    paddingHorizontal: 2,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkSoft,
  },
  error: {
    marginTop: 12,
    ...typography.label,
    color: CLAY,
  },
});
