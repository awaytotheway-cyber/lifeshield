import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

import { ClinicalTerm } from "@/components/ClinicalTerm";
import { StatusChip } from "@/components/results/StatusChip";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { SkeletonCardList } from "@/components/ui/Skeleton";
import {
  BodySmall,
  BodyText,
  ErrorText,
  ScreenTitle,
} from "@/components/ui/Typography";
import { COPY } from "@/lib/copy";
import { colors } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import {
  loadOwnTestResultById,
  meaningForFlag,
  statusChipFromFlag,
  type TestResultRow,
} from "@/lib/test-results";
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

  const chip = statusChipFromFlag(row?.flag);
  const valueBits = [
    row?.result_value?.trim(),
    row?.result_unit?.trim(),
  ].filter((part) => Boolean(part));

  return (
    <Screen scroll>
      <ScreenTitle centered>
        {COPY.labResultDetailTitle}
      </ScreenTitle>

      {loading ? (
        <SkeletonCardList rows={3} />
      ) : null}

      {message ? (
        <>
          <ErrorText className="mt-4" centered>{message}</ErrorText>
          <Button
            title={COPY.labResultsRetry}
            variant="ghost"
            onPress={() => {
              void refresh();
            }}
          />
        </>
      ) : null}

      {!loading && !message && row ? (
        <>
          <View className="mt-4 px-1">
            <StatusChip chip={chip} />
          </View>
          <ClinicalTerm
            termKey={row.test_name}
            plainName={row.plain_name ?? undefined}
          />

          <View className="mt-4 rounded-2xl bg-white px-4 py-4">
            <BodySmall style={{ color: colors.primaryBlue }}>{COPY.labResultValueLabel}</BodySmall>
            <BodyText className="mt-1">
              {valueBits.length > 0
                ? valueBits.join(" ")
                : COPY.labResultNoValue}
            </BodyText>
            <BodySmall className="mt-4" style={{ color: colors.primaryBlue }}>
              {COPY.labResultRangeLabel}
            </BodySmall>
            <BodyText className="mt-1">
              {row.reference_range?.trim()
                ? row.reference_range
                : COPY.labResultNoRange}
            </BodyText>
          </View>

          <BodyText className="mt-4" centered>
            {meaningForFlag(row.flag)}
          </BodyText>
          <BodySmall className="mt-3" centered style={{ color: colors.primaryBlue }}>
            {COPY.labResultNotDiagnosis}
          </BodySmall>

          {row.lab_report_url ? (
            <Button
              title={COPY.labResultPdf}
              variant="ghost"
              onPress={() => {
                void (async () => {
                  try {
                    setPdfMessage(null);
                    await WebBrowser.openBrowserAsync(row.lab_report_url as string);
                  } catch {
                    setPdfMessage(COPY.labResultPdfFailed);
                  }
                })();
              }}
            />
          ) : null}

          {pdfMessage ? (
            <ErrorText className="mt-2" centered>{pdfMessage}</ErrorText>
          ) : null}
        </>
      ) : null}

      <Button
        title={COPY.labResultBack}
        onPress={() => {
          router.replace(routes.labResults);
        }}
      />
    </Screen>
  );
}
