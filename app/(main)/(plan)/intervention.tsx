import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

import { ClinicalTerm } from "@/components/ClinicalTerm";
import { BarriersAccordion } from "@/components/ui/BarriersAccordion";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { SkeletonCardList } from "@/components/ui/Skeleton";
import {
  BodySmall,
  BodyText,
  ErrorText,
  ScreenTitle,
  SectionTitle,
} from "@/components/ui/Typography";
import { COPY } from "@/lib/copy";
import { colors } from "@/lib/design-tokens";
import {
  loadOwnInterventionById,
  reviewStatusLabel,
  type InterventionRow,
} from "@/lib/plan";
import { termKeyForFinding } from "@/lib/plan-groups";
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
      <ScreenTitle centered>
        {COPY.planDetailTitle}
      </ScreenTitle>
      <View className="mt-4 rounded-2xl border border-border bg-iceBlue px-4 py-3">
        <BodyText>{bannerText}</BodyText>
      </View>

      {loading ? (
        <SkeletonCardList rows={3} />
      ) : null}

      {message ? (
        <>
          <ErrorText className="mt-4">{message}</ErrorText>
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
          <SectionTitle className="mt-4">
            {row.title}
          </SectionTitle>
          <BodySmall className="mt-4" style={{ color: colors.primaryBlue }}>{COPY.planDetailWhat}</BodySmall>
          <BodyText className="mt-1">
            {row.description?.trim() ||
              row.plain_reason?.trim() ||
              COPY.planDetailNotInstruction}
          </BodyText>
          <BodySmall className="mt-4" style={{ color: colors.primaryBlue }}>{COPY.planWhyLabel}</BodySmall>
          <BodyText className="mt-1">
            {row.plain_reason?.trim() || COPY.planDetailNotInstruction}
          </BodyText>

          {row.clinician_interaction_check ? (
            <View className="mt-3 min-w-[72px] self-start rounded-full bg-amberLight px-3 py-1">
              <BodySmall style={{ color: colors.charcoal }}>
                {COPY.planNeedsCheck}
              </BodySmall>
            </View>
          ) : null}

          <BodySmall className="mt-4" style={{ color: colors.primaryBlue }}>{COPY.planDetailReview}</BodySmall>
          <BodyText className="mt-1">
            {reviewStatusLabel(row.status)}
          </BodyText>

          <BodySmall className="mt-4" style={{ color: colors.primaryBlue }}>{COPY.planClinicalBasis}</BodySmall>
          <BodyText className="mt-1">
            {row.clinical_basis?.trim() || row.trigger_finding}
          </BodyText>

          <BodySmall className="mt-6" style={{ color: colors.primaryBlue }}>
            {COPY.planDetailFinding}
          </BodySmall>
          <ClinicalTerm
            termKey={termKey}
            plainName={row.title}
            plainExplanation={row.plain_reason ?? undefined}
            medicalName={row.trigger_finding}
          />

          <BodySmall className="mt-4" style={{ color: colors.primaryBlue }}>
            {COPY.planDetailNotInstruction}
          </BodySmall>

          {session?.user.id ? (
            <BarriersAccordion
              userId={session.user.id}
              category={row.category as any}
              sourceType="intervention"
              sourceId={row.id}
            />
          ) : null}
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
