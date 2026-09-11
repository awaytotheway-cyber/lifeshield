import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResultCard } from "@/components/ui/ResultCard";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import { colors, spacing } from "@/lib/design-tokens";
import { getTerm } from "@/lib/plain-language";
import { resultDetailHref, routes } from "@/lib/routes";
import {
  loadOwnTestResults,
  meaningForFlag,
  statusChipFromFlag,
  type TestResultRow,
} from "@/lib/test-results";
import { fontFamily } from "@/lib/typography";
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

  const listData = useMemo<ListRow[]>(() => {
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

  return (
    <Screen contentPadding={spacing.screenX} centered={false}>
      <ScreenHeader
        title={COPY.labResultsTitle}
        onBack={() => router.replace(routes.home)}
        backLabel={COPY.resultsBackHome}
      />
      <Text style={styles.body}>{COPY.labResultsSummary}</Text>

      {loading ? <StaticSkeleton rows={4} /> : null}

      {message ? (
        <>
          <Text style={styles.error}>{message}</Text>
          <TextButton title={COPY.labResultsRetry} onPress={() => void refresh()} />
        </>
      ) : null}

      {!loading && !message && rows.length === 0 ? (
        <EmptyState
          icon="bar-chart-2"
          heading={COPY.labResultsEmptyHeading}
          explanation={COPY.labResultsEmpty}
        />
      ) : null}

      {!loading && !message && rows.length > 0 ? (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            if (item.kind === "heading") {
              return <Text style={styles.group}>{item.title}</Text>;
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
            <PrimaryButton
              title={COPY.labResultsSeePlan}
              onPress={() => {
                router.push(routes.plan);
              }}
            />
          }
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
    textAlign: "center",
    marginBottom: 8,
  },
  error: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.coral,
    textAlign: "center",
  },
  list: {
    paddingBottom: 32,
  },
  group: {
    marginTop: 16,
    marginBottom: 8,
    fontFamily: fontFamily.bodySemi,
    fontSize: 20,
    color: colors.deepTeal,
  },
  cardGap: {
    marginBottom: 12,
  },
});
