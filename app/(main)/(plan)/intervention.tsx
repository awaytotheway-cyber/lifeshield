import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

import { ClinicalTerm } from "@/components/ClinicalTerm";
import { BarriersAccordion } from "@/components/ui/BarriersAccordion";
import { Button } from "@/components/ui/Button";
import { Disclosure } from "@/components/ui/Disclosure";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SkeletonCardList } from "@/components/ui/Skeleton";
import {
  BodySmall,
  BodyText,
  ErrorText,
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
      <ScreenHeader
        title={COPY.planDetailTitle}
        onBack={() => router.back()}
      />
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

          {/*
            Essentials only, above the fold: what this draft actually suggests,
            whether it needs a practitioner check, and where it is in review.
            Everything that answers "tell me more" sits behind a disclosure.
          */}
          <BodyText className="mt-2">
            {row.description?.trim() ||
              row.plain_reason?.trim() ||
              COPY.planDetailNotInstruction}
          </BodyText>

          <View className="mt-3 flex-row flex-wrap items-center gap-2">
            <View className="min-w-[72px] self-start rounded-full bg-iceBlue px-3 py-1">
              <BodySmall style={{ color: colors.charcoal }}>
                {reviewStatusLabel(row.status)}
              </BodySmall>
            </View>
            {row.clinician_interaction_check ? (
              <View className="min-w-[72px] self-start rounded-full bg-riskModerateLight px-3 py-1">
                <BodySmall style={{ color: colors.charcoal }}>
                  {COPY.planNeedsCheck}
                </BodySmall>
              </View>
            ) : null}
          </View>

          <View className="mt-5">
            <Disclosure label={COPY.planWhyLabel}>
              <BodyText>
                {row.plain_reason?.trim() || COPY.planDetailNotInstruction}
              </BodyText>
            </Disclosure>

            <Disclosure label={COPY.planClinicalBasis}>
              <BodyText>
                {row.clinical_basis?.trim() || row.trigger_finding}
              </BodyText>
            </Disclosure>

            <Disclosure label={COPY.planDetailFinding}>
              <ClinicalTerm
                termKey={termKey}
                plainName={row.title}
                plainExplanation={row.plain_reason ?? undefined}
                medicalName={row.trigger_finding}
              />
            </Disclosure>
          </View>

          <BodySmall className="mt-4">
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
