import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TextButton } from "@/components/ui/Button";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { DonutRing } from "@/components/ui/DonutRing";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips, type FilterChip } from "@/components/ui/FilterChips";
import { GradientHero } from "@/components/ui/GradientHero";
import { ResultCard } from "@/components/ui/ResultCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import { Colors, Spacing, Typography } from "@/lib/design-tokens";
import { Accent, Ink } from "@/lib/specimen-tokens";
import { getTerm } from "@/lib/plain-language";
import { resultDetailHref, routes } from "@/lib/routes";
import {
  loadOwnTestResults,
  meaningForFlag,
  statusChipFromFlag,
  type TestResultRow,
} from "@/lib/test-results";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";
import type { StatusChipKind } from "@/components/ui/StatusChip";

type ListRow =
  | { kind: "heading"; id: string; title: string }
  | { kind: "result"; id: string; row: TestResultRow };

function kindFromTone(tone: string): StatusChipKind {
  if (tone === "needs_attention") {
    return "critical";
  }
  if (tone === "worth_watching") {
    return "attention";
  }
  return "normal";
}

export default function LabResultsScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<TestResultRow[]>([]);
  const [filter, setFilter] = useState<string>("all");

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

  const counts = useMemo(() => {
    let attention = 0;
    let watching = 0;
    let normal = 0;
    for (const row of rows) {
      const tone = statusChipFromFlag(row.flag).tone;
      if (tone === "needs_attention") attention += 1;
      else if (tone === "worth_watching") watching += 1;
      else normal += 1;
    }
    return { attention, watching, normal, total: rows.length };
  }, [rows]);

  const filterChips = useMemo<FilterChip[]>(
    () => [
      { value: "all", label: `All (${counts.total})` },
      { value: "attention", label: `Needs attention (${counts.attention})` },
      { value: "watching", label: `Worth watching (${counts.watching})` },
      { value: "normal", label: `In range (${counts.normal})` },
    ],
    [counts],
  );

  const visibleRows = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((row) => {
      const tone = statusChipFromFlag(row.flag).tone;
      if (filter === "attention") return tone === "needs_attention";
      if (filter === "watching") return tone === "worth_watching";
      return tone === "within_range";
    });
  }, [rows, filter]);

  const listData = useMemo<ListRow[]>(() => {
    const rows = visibleRows;
    const watching = rows.filter((row) => {
      const tone = statusChipFromFlag(row.flag).tone;
      return tone === "worth_watching" || tone === "needs_attention";
    });
    const inRange = rows.filter((row) => {
      const tone = statusChipFromFlag(row.flag).tone;
      return tone === "within_range";
    });
    const out: ListRow[] = [];
    if (watching.length > 0) {
      out.push({
        kind: "heading",
        id: "watch",
        title: COPY.resultsGroupWatching,
      });
      for (const row of watching) {
        out.push({ kind: "result", id: row.id, row });
      }
    }
    if (inRange.length > 0) {
      out.push({
        kind: "heading",
        id: "range",
        title: COPY.resultsGroupRange,
      });
      for (const row of inRange) {
        out.push({ kind: "result", id: row.id, row });
      }
    }
    return out;
  }, [visibleRows]);

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  const allNormal = counts.attention === 0 && counts.watching === 0;
  const ringProgress = counts.total > 0 ? counts.normal / counts.total : 0;

  return (
    <View style={styles.root}>
      <GradientHero
        height={210}
        onBack={() => router.replace(routes.home)}
        backLabel={COPY.resultsBackHome}
      >
        <View style={styles.heroRow}>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>{COPY.labResultsTitle}</Text>
            <Text style={styles.heroSub}>{COPY.labResultsSummary}</Text>
          </View>
          <DonutRing
            progress={ringProgress}
            value={counts.total}
            caption="results"
            size={100}
            color={allNormal ? Accent.sage : Accent.ochre}
          />
        </View>
      </GradientHero>

      <View style={styles.chipsWrap}>
        <FilterChips chips={filterChips} value={filter} onChange={setFilter} />
      </View>

      {loading ? (
        <View style={styles.pad}>
          <StaticSkeleton rows={4} />
        </View>
      ) : null}

      {message ? (
        <View style={styles.pad}>
          <Text style={styles.error}>{message}</Text>
          <TextButton title={COPY.labResultsRetry} onPress={() => void refresh()} />
        </View>
      ) : null}

      {!loading && !message && rows.length === 0 ? (
        <View style={styles.pad}>
          <EmptyState
            icon="bar-chart-2"
            heading={COPY.labResultsEmptyHeading}
            explanation={COPY.labResultsEmpty}
          />
        </View>
      ) : null}

      {!loading && !message && rows.length > 0 ? (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            if (item.kind === "heading") {
              return (
                <View style={styles.groupWrap}>
                  <SectionHeader title={item.title} />
                </View>
              );
            }
            const chip = statusChipFromFlag(item.row.flag);
            const term = getTerm(item.row.test_name);
            return (
              <View style={styles.cardGap}>
                <ResultCard
                  plainName={item.row.plain_name?.trim() || term.plainName}
                  meaning={meaningForFlag(item.row.flag)}
                  medicalName={term.medicalName}
                  status={kindFromTone(chip.tone)}
                  statusLabel={chip.label}
                  onPress={() => {
                    router.push(resultDetailHref(item.row.id));
                  }}
                />
              </View>
            );
          }}
          ListFooterComponent={
            <SafeAreaView edges={["bottom"]} style={styles.footer}>
              <PrimaryButton
                label={COPY.labResultsSeePlan}
                onPress={() => {
                  router.push(routes.plan);
                }}
              />
            </SafeAreaView>
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.softWhite,
  },
  heroRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.base,
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: Typography.heading,
    fontSize: Typography.screenTitle,
    lineHeight: 38,
    letterSpacing: -0.6,
    color: Ink.full,
  },
  heroSub: {
    marginTop: 8,
    fontFamily: Typography.regular,
    fontSize: 16,
    lineHeight: 23,
    color: Ink.soft,
  },
  chipsWrap: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  pad: {
    paddingHorizontal: Spacing.screenH,
  },
  error: {
    marginTop: Spacing.md,
    fontFamily: Typography.regular,
    fontSize: Typography.secondary,
    color: Colors.dangerRed,
    textAlign: "center",
  },
  list: {
    paddingHorizontal: Spacing.screenH,
    paddingBottom: 32,
  },
  groupWrap: {
    marginTop: Spacing.base,
  },
  footer: {
    marginTop: Spacing.base,
  },
  cardGap: {
    marginBottom: 12,
  },
});
