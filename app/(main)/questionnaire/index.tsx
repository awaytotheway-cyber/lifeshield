import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { SectionNotice } from "@/components/questionnaire/SectionNotice";
import { SectionProgress } from "@/components/questionnaire/SectionProgress";
import { PrimaryButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { SetupBanners } from "@/components/ui/SetupBanners";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import {
  allConsentsAgreed,
  firstIncompleteConsent,
  hrefForConsent,
} from "@/lib/consent-flow";
import {
  QUESTIONNAIRE_HUB_SECTIONS,
  type HubSectionKey,
} from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";
import { useConsentStore } from "@/stores/consent-store";
import {
  useQuestionnaireStore,
  completedSectionCount,
} from "@/stores/questionnaire-store";
import { useTriageStore } from "@/stores/triage-store";

/** Heading above the ten-section list. Lives here because it is screen chrome. */
const SECTIONS_HEADING = "Your sections";

function hrefForSection(key: HubSectionKey) {
  switch (key) {
    case "demographics":
      return routes.qDemographics;
    case "reproductive_menstrual":
      return routes.qReproductive;
    case "radiation_occupational":
      return routes.qRadiation;
    case "comorbidities":
      return routes.qComorbidities;
    case "family_history":
      return routes.qFamilyHistory;
    case "personal_history":
      return routes.qPersonal;
    case "lifestyle":
      return routes.qLifestyle;
    case "stress":
      return routes.qStress;
    case "diet_environment":
      return routes.qDiet;
    case "prior_screening":
      return routes.qPriorScreening;
    default:
      return null;
  }
}

export default function QuestionnaireHubScreen() {
  const router = useRouter();
  const triageStatus = useTriageStore((state) => state.status);
  const consentLoading = useConsentStore((state) => state.loading);
  const loaded = useConsentStore((state) => state.loaded);
  const agreed = useConsentStore((state) => state.agreed);
  const progress = useQuestionnaireStore((state) => state.progress);
  const hubLoading = useQuestionnaireStore((state) => state.loading);
  const hubHydrated = useQuestionnaireStore((state) => state.hydrated);
  const hubError = useQuestionnaireStore((state) => state.errorMessage);
  const loadHub = useQuestionnaireStore((state) => state.load);
  const interruptPendingReproductive = useQuestionnaireStore(
    (state) => state.interruptPendingReproductive,
  );
  const interruptPendingFamily = useQuestionnaireStore(
    (state) => state.interruptPendingFamily,
  );
  const session = useAuthStore((state) => state.session);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user.id || hubHydrated || hubLoading) {
      return;
    }
    void loadHub(session.user.id);
  }, [session?.user.id, hubHydrated, hubLoading, loadHub]);

  useEffect(() => {
    if (!hubHydrated || hubLoading) {
      return;
    }
    if (interruptPendingReproductive) {
      router.replace(routes.qReproductive);
      return;
    }
    if (interruptPendingFamily) {
      router.replace(routes.qFamilyHistory);
    }
  }, [
    hubHydrated,
    hubLoading,
    interruptPendingReproductive,
    interruptPendingFamily,
    router,
  ]);

  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  if (!consentLoading && loaded && !allConsentsAgreed(agreed)) {
    const next = firstIncompleteConsent(agreed);
    return <Redirect href={next ? hrefForConsent(next) : routes.consentBrca} />;
  }

  const doneCount = completedSectionCount(progress);
  const total = QUESTIONNAIRE_HUB_SECTIONS.length;

  const openSection = (key: HubSectionKey) => {
    setHint(null);
    if (!hubHydrated || hubLoading) {
      return;
    }
    if (interruptPendingReproductive) {
      router.replace(routes.qReproductive);
      return;
    }
    if (interruptPendingFamily && key !== "family_history") {
      router.replace(routes.qFamilyHistory);
      return;
    }
    const href = hrefForSection(key);
    if (href) {
      router.push(href);
    }
  };

  return (
    <Screen scroll>
      {/* The title scrolls away with the list rather than pinning, so the ten
          sections get as much of the screen as possible. */}
      <ScreenHeader
        title={COPY.hubTitle}
        onBack={() => router.replace(routes.home)}
        subtitle={COPY.hubBody}
      />

      <Card>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>{COPY.hubProgressLabel}</Text>
          <Text style={styles.progressCount}>
            {doneCount}
            <Text style={styles.progressTotal}>{` / ${total}`}</Text>
          </Text>
        </View>
        <ProgressBar current={doneCount} total={total} />
      </Card>

      <SetupBanners />
      {hubError ? <SectionNotice message={hubError} /> : null}
      {hint ? <SectionNotice message={hint} tone="info" /> : null}

      <SectionTitle title={SECTIONS_HEADING} />

      {hubLoading ? (
        <StaticSkeleton rows={4} />
      ) : (
        <SectionProgress progress={progress} onPressSection={openSection} />
      )}

      {!hubLoading && hubError ? (
        <View style={styles.empty}>
          <EmptyState
            icon="clipboard"
            heading={COPY.hubTitle}
            explanation={hubError}
          />
        </View>
      ) : null}

      {doneCount >= total ? (
        <PrimaryButton
          title={COPY.hubOpenResults}
          onPress={() => {
            router.replace(routes.results);
          }}
          style={styles.results}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: Space.sm,
  },
  progressLabel: {
    flex: 1,
    ...typeStyle("label"),
    color: Colors.muted,
  },
  progressCount: {
    ...typeStyle("dataBig"),
    color: Colors.orange,
  },
  progressTotal: {
    ...typeStyle("cardTitle"),
    color: Colors.faint,
  },
  empty: {
    marginTop: Gap.cards,
  },
  results: {
    marginTop: Gap.sections,
  },
});
