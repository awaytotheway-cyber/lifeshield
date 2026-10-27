import * as WebBrowser from "expo-web-browser";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { StatusChip } from "@/components/results/StatusChip";
import { IconButton, TextButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Surface } from "@/components/ui/Surface";
import { COPY } from "@/lib/copy";
import { colors, spacing, status, tapTarget } from "@/lib/design-tokens";
import { getTerm, hasTerm } from "@/lib/plain-language";
import { routes } from "@/lib/routes";
import {
  loadOwnTestResultById,
  meaningForFlag,
  type TestResultRow,
} from "@/lib/test-results";
import { fontFamily, typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/** Failure text borrows the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

/** The label over the exact clinical term. This screen is where it lives. */
const CLINICAL_LABEL = "Clinical name";

export default function ResultDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [row, setRow] = useState<TestResultRow | null>(null);
  const [pdfMessage, setPdfMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session?.user.id) {
      return;
    }
    const resultId = typeof id === "string" ? id.trim() : "";
    if (!resultId) {
      setRow(null);
      setMessage(COPY.labResultDetailMissing);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await loadOwnTestResultById(session.user.id, resultId);
      if (!result.ok) {
        setMessage(result.message);
        setRow(null);
      } else if (result.rows.length === 0) {
        setMessage(COPY.labResultDetailMissing);
        setRow(null);
      } else {
        setRow(result.rows[0]);
        setMessage(null);
      }
    } catch {
      setMessage(COPY.labResultDetailLoadFailed);
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [session?.user.id, id]);

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    void refresh();
  }, [session?.user.id, refresh]);

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  const term = row ? getTerm(row.test_name) : null;
  const fromDictionary = Boolean(row && hasTerm(row.test_name));
  const plainName =
    row?.plain_name?.trim() ||
    (fromDictionary ? term?.plainName : undefined) ||
    row?.test_name ||
    COPY.labResultDetailTitle;
  const value = row?.result_value?.trim();
  const unit = row?.result_unit?.trim();
  const range = row?.reference_range?.trim();

  return (
    <Screen scroll contentPadding={spacing.screenX} centered={false}>
      <View style={styles.topRow}>
        <IconButton
          icon="arrow-left"
          accessibilityLabel={COPY.labResultBack}
          onPress={() => router.replace(routes.labResults)}
          // Pulled out to the gutter so the glyph, not its 44pt hit area,
          // lines up with the headline under it.
          style={styles.back}
        />
        <Text style={styles.eyebrow}>{COPY.labResultDetailTitle}</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.spinner} color={colors.ink} />
      ) : null}

      {message ? (
        <>
          <Text style={styles.error}>{message}</Text>
          <TextButton
            title={COPY.labResultsRetry}
            onPress={() => {
              void refresh();
            }}
          />
        </>
      ) : null}

      {!loading && !message && row ? (
        <>
          <Text style={styles.name} accessibilityRole="header">
            {plainName}
          </Text>
          <View style={styles.chipRow}>
            <StatusChip flag={row.flag} />
          </View>

          {/* The lab's own numbers. The plain words came first, on the list. */}
          <Surface style={styles.numbers}>
            <Text style={styles.label}>{COPY.labResultValueLabel}</Text>
            {value ? (
              <View style={styles.valueRow}>
                <Text style={styles.value}>{value}</Text>
                {unit ? <Text style={styles.unit}>{unit}</Text> : null}
              </View>
            ) : (
              <Text style={styles.plainValue}>{COPY.labResultNoValue}</Text>
            )}

            <Text style={styles.labelSpaced}>{COPY.labResultRangeLabel}</Text>
            <Text style={styles.plainValue}>
              {range ? range : COPY.labResultNoRange}
            </Text>
          </Surface>

          <Text style={styles.meaning}>{meaningForFlag(row.flag)}</Text>

          {/*
            The clinical term, which the list deliberately leaves out: this is
            the screen the UI kit says it waits on, where there is room for the
            everyday sentence and the exact wording underneath it.
          */}
          <Surface style={styles.clinical}>
            {fromDictionary && term ? (
              <Text style={styles.explain}>{term.plainExplanation}</Text>
            ) : null}
            <Text
              style={[
                styles.label,
                fromDictionary && term ? styles.labelSpaced : null,
              ]}
            >
              {CLINICAL_LABEL}
            </Text>
            <Text style={styles.medical}>
              {term?.medicalName ?? row.test_name}
            </Text>
          </Surface>

          <Text style={styles.note}>{COPY.labResultNotDiagnosis}</Text>

          {row.lab_report_url ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={COPY.labResultPdf}
              onPress={() => {
                void (async () => {
                  try {
                    setPdfMessage(null);
                    await WebBrowser.openBrowserAsync(
                      row.lab_report_url as string,
                    );
                  } catch {
                    setPdfMessage(COPY.labResultPdfFailed);
                  }
                })();
              }}
              style={styles.linkHit}
            >
              <Text style={styles.linkText}>{COPY.labResultPdf}</Text>
            </Pressable>
          ) : null}

          {pdfMessage ? (
            <Text style={styles.error}>{pdfMessage}</Text>
          ) : null}
        </>
      ) : null}
    </Screen>
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
  eyebrow: {
    ...typography.micro,
    color: colors.inkMuted,
  },
  spinner: {
    marginTop: 24,
  },
  // The result's own name, as the one headline. It is data rather than copy,
  // so it is not split two-tone — there is no grammar word to grey out.
  name: {
    marginTop: 8,
    ...typography.displayL,
    color: colors.ink,
  },
  chipRow: {
    marginTop: 14,
  },
  numbers: {
    marginTop: 18,
  },
  clinical: {
    marginTop: 14,
  },
  label: {
    ...typography.micro,
    color: colors.inkMuted,
  },
  labelSpaced: {
    marginTop: 18,
  },
  valueRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  value: {
    ...typography.displayL,
    color: colors.ink,
  },
  unit: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
  },
  plainValue: {
    marginTop: 6,
    ...typography.body,
    color: colors.ink,
  },
  meaning: {
    marginTop: 18,
    ...typography.body,
    lineHeight: 24,
    color: colors.ink,
  },
  explain: {
    ...typography.body,
    color: colors.inkSoft,
  },
  medical: {
    marginTop: 4,
    fontFamily: fontFamily.medical,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
  },
  note: {
    marginTop: 16,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkSoft,
  },
  linkHit: {
    marginTop: 10,
    minHeight: tapTarget,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  linkText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 15,
    color: colors.ink,
    textDecorationLine: "underline",
  },
  error: {
    marginTop: 12,
    ...typography.label,
    color: CLAY,
  },
});
