import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { ClinicalTerm } from "@/components/ClinicalTerm";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { COPY } from "@/lib/copy";
import { termKeyForFinding } from "@/lib/plan-groups";
import {
  loadOwnInterventionById,
  reviewStatusLabel,
  type InterventionRow,
} from "@/lib/plan";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

export default function PlanItemScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [row, setRow] = useState<InterventionRow | null>(null);

  const refresh = useCallback(async () => {
    if (!session?.user.id) {
      return;
    }
    const itemId = typeof id === "string" ? id.trim() : "";
    if (!itemId) {
      setRow(null);
      setMessage(COPY.planDetailMissing);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await loadOwnInterventionById(session.user.id, itemId);
      if (!result.ok) {
        setMessage(result.message);
        setRow(null);
      } else if (result.rows.length === 0) {
        setMessage(COPY.planDetailMissing);
        setRow(null);
      } else {
        setRow(result.rows[0]);
        setMessage(null);
      }
    } catch {
      setMessage(COPY.planDetailLoadFailed);
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

  const termKey = row ? termKeyForFinding(row.trigger_finding) : undefined;
  const bannerText = row
    ? row.status === "active"
      ? COPY.planBannerFinalised
      : row.status === "clinician_approved"
        ? COPY.planBannerApproved
        : COPY.planBanner
    : COPY.planBanner;

  return (
    <Screen scroll>
      <Text className="text-center text-2xl text-charcoal">
        {COPY.planDetailTitle}
      </Text>
      <View className="mt-4 rounded-xl border border-teal bg-white px-4 py-3">
        <Text className="text-center text-charcoal">{bannerText}</Text>
      </View>

      {loading ? (
        <ActivityIndicator className="mt-6" color="#FF6000" />
      ) : null}

      {message ? (
        <>
          <Text className="mt-4 text-center text-coral">{message}</Text>
          <Button
            title={COPY.planRetry}
            variant="ghost"
            onPress={() => {
              void refresh();
            }}
          />
        </>
      ) : null}

      {!loading && !message && row ? (
        <>
          <Text className="mt-4 text-center text-xl text-charcoal">
            {row.title}
          </Text>
          <Text className="mt-4 text-sm text-teal">{COPY.planDetailWhat}</Text>
          <Text className="mt-1 text-charcoal">
            {row.description?.trim() ||
              row.plain_reason?.trim() ||
              COPY.planDetailNotInstruction}
          </Text>
          <Text className="mt-4 text-sm text-teal">{COPY.planWhyLabel}</Text>
          <Text className="mt-1 text-charcoal">
            {row.plain_reason?.trim() || COPY.planDetailNotInstruction}
          </Text>

          {row.clinician_interaction_check ? (
            <View
              className="mt-3 self-start rounded-full px-3 py-1"
              style={{ backgroundColor: "rgba(255,194,75,0.18)" }}
            >
              <Text className="text-sm text-charcoal">{COPY.planNeedsCheck}</Text>
            </View>
          ) : null}

          <Text className="mt-4 text-sm text-teal">{COPY.planDetailReview}</Text>
          <Text className="mt-1 text-charcoal">
            {reviewStatusLabel(row.status)}
          </Text>

          <Text className="mt-4 text-sm text-teal">{COPY.planClinicalBasis}</Text>
          <Text className="mt-1 text-charcoal">
            {row.clinical_basis?.trim() || row.trigger_finding}
          </Text>

          <Text className="mt-6 text-center text-sm text-teal">
            {COPY.planDetailFinding}
          </Text>
          <ClinicalTerm
            termKey={termKey}
            plainName={row.title}
            plainExplanation={row.plain_reason ?? undefined}
            medicalName={row.trigger_finding}
          />

          <Text className="mt-4 text-center text-sm text-teal">
            {COPY.planDetailNotInstruction}
          </Text>
        </>
      ) : null}

      <Button
        title={COPY.planDetailBack}
        onPress={() => {
          router.replace(routes.plan);
        }}
      />
    </Screen>
  );
}
