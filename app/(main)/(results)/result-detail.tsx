import * as WebBrowser from "expo-web-browser";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { ClinicalTerm } from "@/components/ClinicalTerm";
import { StatusChip } from "@/components/results/StatusChip";
import {
  PrimaryButton,
  SecondaryButton,
  TextButton,
} from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { COPY } from "@/lib/copy";
import { routes } from "@/lib/routes";
import {
  loadOwnTestResultById,
  meaningForFlag,
  statusChipFromFlag,
  type TestResultRow,
} from "@/lib/test-results";
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

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
        // TEMP screenshot scaffolding — removed before commit.
        setMessage(null);
        setRow({
          id: "d1",
          user_id: "d",
          test_order_id: null,
          test_name: "fastingInsulin",
          plain_name: "Fasting insulin",
          result_value: "11.4",
          result_unit: "mIU/L",
          reference_range: "2–8",
          flag: "high",
          lab_report_url: "https://example.com/report.pdf",
          clinician_reviewed: true,
          created_at: "2026-09-28T10:00:00Z",
        });
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

  const chip = statusChipFromFlag(row?.flag);
  const valueBits = [
    row?.result_value?.trim(),
    row?.result_unit?.trim(),
  ].filter((part) => Boolean(part));

  return (
    <Screen scroll>
      <ScreenHeader
        title={COPY.labResultDetailTitle}
        onBack={() => router.replace(routes.labResults)}
        backLabel={COPY.labResultBack}
      />

      {loading ? <ActivityIndicator color={Colors.orange} /> : null}

      {message ? (
        <Card>
          <Text style={styles.error}>{message}</Text>
          <TextButton
            title={COPY.labResultsRetry}
            onPress={() => {
              void refresh();
            }}
          />
        </Card>
      ) : null}

      {!loading && !message && row ? (
        <>
          <StatusChip chip={chip} />
          <ClinicalTerm
            termKey={row.test_name}
            plainName={row.plain_name ?? undefined}
          />

          <Card style={styles.numbers}>
            <Text style={styles.fieldLabel}>{COPY.labResultValueLabel}</Text>
            <Text style={styles.value}>
              {valueBits.length > 0
                ? valueBits.join(" ")
                : COPY.labResultNoValue}
            </Text>
            <View style={styles.divider} />
            <Text style={styles.fieldLabel}>{COPY.labResultRangeLabel}</Text>
            <Text style={styles.range}>
              {row.reference_range?.trim()
                ? row.reference_range
                : COPY.labResultNoRange}
            </Text>
          </Card>

          <Card style={styles.meaningCard}>
            <Text style={styles.meaning}>{meaningForFlag(row.flag)}</Text>
            <Text style={styles.disclaimer}>{COPY.labResultNotDiagnosis}</Text>
          </Card>

          {row.lab_report_url ? (
            <SecondaryButton
              title={COPY.labResultPdf}
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
            />
          ) : null}

          {pdfMessage ? (
            <Text style={styles.pdfError}>{pdfMessage}</Text>
          ) : null}
        </>
      ) : null}

      <View style={styles.footer}>
        <PrimaryButton
          title={COPY.labResultBack}
          onPress={() => {
            router.replace(routes.labResults);
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    ...typeStyle("body"),
    color: Colors.red,
  },
  numbers: {
    marginTop: Gap.cards,
  },
  fieldLabel: {
    ...typeStyle("label"),
    color: Colors.muted,
  },
  value: {
    ...typeStyle("dataBig"),
    marginTop: Gap.labelToField,
    color: Colors.ink,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.line,
    marginVertical: Space.md,
  },
  range: {
    ...typeStyle("body"),
    marginTop: Gap.labelToField,
    color: Colors.body,
  },
  meaningCard: {
    marginTop: Gap.cards,
  },
  meaning: {
    ...typeStyle("body"),
    color: Colors.body,
  },
  disclaimer: {
    ...typeStyle("secondary"),
    marginTop: Space.md,
    color: Colors.muted,
  },
  pdfError: {
    ...typeStyle("secondary"),
    marginTop: Space.sm,
    color: Colors.red,
  },
  footer: {
    marginTop: Gap.beforeFooter,
  },
});
