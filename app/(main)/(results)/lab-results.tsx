import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { BackButton } from "@/components/ui/BackButton";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Hero } from "@/components/ui/Hero";
import { ResultCard } from "@/components/ui/ResultCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import type { StatusChipKind } from "@/components/ui/StatusChip";
import { COPY } from "@/lib/copy";
import { formatDisplayDate } from "@/lib/datetime";
import { getTerm } from "@/lib/plain-language";
import { resultDetailHref, routes } from "@/lib/routes";
import {
  loadOwnTestResults,
  meaningForFlag,
  statusChipFromFlag,
  type TestResultRow,
} from "@/lib/test-results";
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/** Which group a row belongs to. Drives both the filter chips and the sections. */
type ResultFilter = "all" | "watching" | "range";

function kindFromTone(tone: string): StatusChipKind {
  if (tone === "needs_attention") {
    return "critical";
  }
  if (tone === "worth_watching") {
    return "attention";
  }
  return "normal";
}

/** Everyday date for the hero line. Timestamps arrive as "YYYY-MM-DD…". */
function heroDate(rows: TestResultRow[]): string | undefined {
  const newest = rows[0]?.created_at?.slice(0, 10);
  if (!newest) {
    return undefined;
  }
  return formatDisplayDate(newest);
}

// TEMP screenshot scaffolding — removed before commit.
const TEMP_DEMO_ROWS: TestResultRow[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    user_id: "d",
    test_order_id: null,
    test_name: "stool",
    plain_name: "Gut health check",
    result_value: "Dysbiosis pattern reported",
    result_unit: null,
    reference_range: "No dysbiosis pattern",
    flag: "critical",
    lab_report_url: null,
    clinician_reviewed: true,
    created_at: "2026-09-28T10:00:00Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    user_id: "d",
    test_order_id: null,
    test_name: "fastingInsulin",
    plain_name: "Fasting insulin",
    result_value: "11.4",
    result_unit: "mIU/L",
    reference_range: "2–8",
    flag: "high",
    lab_report_url: null,
    clinician_reviewed: true,
    created_at: "2026-09-28T10:00:00Z",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    user_id: "d",
    test_order_id: null,
    test_name: "vitaminD",
    plain_name: "Vitamin D",
    result_value: "78",
    result_unit: "nmol/L",
    reference_range: "50–125",
    flag: "normal",
    lab_report_url: null,
    clinician_reviewed: true,
    created_at: "2026-09-28T10:00:00Z",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    user_id: "d",
    test_order_id: null,
    test_name: "ferritin",
    plain_name: "Iron stores (ferritin)",
    result_value: "64",
    result_unit: "µg/L",
    reference_range: "30–150",
    flag: "normal",
    lab_report_url: null,
    clinician_reviewed: true,
    created_at: "2026-09-28T10:00:00Z",
  },
];

export default function LabResultsScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<TestResultRow[]>([]);
  const [filter, setFilter] = useState<ResultFilter>("all");

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
        setRows(result.rows.length > 0 ? result.rows : TEMP_DEMO_ROWS);
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

  const watching = useMemo(
    () =>
      rows.filter((row) => {
        const tone = statusChipFromFlag(row.flag).tone;
        return tone === "worth_watching" || tone === "needs_attention";
      }),
    [rows],
  );

  const inRange = useMemo(
    () =>
      rows.filter(
        (row) => statusChipFromFlag(row.flag).tone === "within_range",
      ),
    [rows],
  );

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  const showResults = !loading && !message && rows.length > 0;
  const showEmpty = !loading && !message && rows.length === 0;
  const date = heroDate(rows);

  const renderCard = (row: TestResultRow) => {
    const chip = statusChipFromFlag(row.flag);
    const term = getTerm(row.test_name);
    const valueBits = [row.result_value?.trim(), row.result_unit?.trim()].filter(
      (part) => Boolean(part),
    );
    const range = row.reference_range?.trim();
    return (
      <ResultCard
        key={row.id}
        plainName={row.plain_name?.trim() || term.plainName}
        meaning={meaningForFlag(row.flag)}
        medicalName={term.medicalName}
        status={kindFromTone(chip.tone)}
        statusLabel={chip.label}
        value={valueBits.length > 0 ? valueBits.join(" ") : undefined}
        referenceRange={range ? `${COPY.labResultRangeLabel}: ${range}` : undefined}
        onPress={() => {
          router.push(resultDetailHref(row.id));
        }}
      />
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Hero>
          <BackButton
            onPress={() => router.replace(routes.home)}
            accessibilityLabel={COPY.resultsBackHome}
          />
          {date ? <Text style={styles.heroDate}>{date}</Text> : null}
          <Text style={styles.heroTitle} accessibilityRole="header">
            {COPY.labResultsTitle}
          </Text>
          <Text style={styles.heroLine}>{COPY.labResultsSummary}</Text>
        </Hero>

        <View style={styles.body}>
          {showResults ? (
            <View style={styles.filters}>
              <Chip
                label={COPY.recipesFilterAll}
                selected={filter === "all"}
                onPress={() => setFilter("all")}
              />
              {watching.length > 0 ? (
                <Chip
                  label={COPY.resultsGroupWatching}
                  selected={filter === "watching"}
                  onPress={() => setFilter("watching")}
                />
              ) : null}
              {inRange.length > 0 ? (
                <Chip
                  label={COPY.resultsGroupRange}
                  selected={filter === "range"}
                  onPress={() => setFilter("range")}
                />
              ) : null}
            </View>
          ) : null}

          {loading ? <StaticSkeleton rows={4} /> : null}

          {message ? (
            <Card>
              <Text style={styles.error}>{message}</Text>
              <TextButton
                title={COPY.labResultsRetry}
                onPress={() => void refresh()}
              />
            </Card>
          ) : null}

          {showEmpty ? (
            <Card>
              <Text style={styles.emptyHeading}>
                {COPY.labResultsEmptyHeading}
              </Text>
              <Text style={styles.emptyBody}>{COPY.labResultsEmpty}</Text>
            </Card>
          ) : null}

          {showResults && filter !== "range" && watching.length > 0 ? (
            <>
              <SectionTitle title={COPY.resultsGroupWatching} />
              <View style={styles.cardStack}>{watching.map(renderCard)}</View>
            </>
          ) : null}

          {showResults && filter !== "watching" && inRange.length > 0 ? (
            <>
              <SectionTitle title={COPY.resultsGroupRange} />
              <View style={styles.cardStack}>{inRange.map(renderCard)}</View>
            </>
          ) : null}

          {showResults ? (
            <View style={styles.footer}>
              <PrimaryButton
                title={COPY.labResultsSeePlan}
                onPress={() => {
                  router.push(routes.plan);
                }}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingBottom: Gap.screenBottom,
  },
  heroDate: {
    ...typeStyle("secondary"),
    marginTop: Space.lg,
    color: Colors.muted,
  },
  heroTitle: {
    ...typeStyle("hero"),
    marginTop: Space.xs,
    color: Colors.ink,
  },
  heroLine: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
  },
  body: {
    paddingHorizontal: Space.screenH,
    // Section 8: 40px between the hero and the filter row.
    paddingTop: Gap.sections,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
  },
  cardStack: {
    gap: Gap.cards,
  },
  error: {
    ...typeStyle("body"),
    color: Colors.red,
  },
  emptyHeading: {
    ...typeStyle("section"),
    color: Colors.ink,
  },
  emptyBody: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
  },
  footer: {
    marginTop: Gap.screenBottom,
  },
});
