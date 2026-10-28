import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { SectionProgress } from "@/components/questionnaire/SectionProgress";
import { PrimaryButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { SetupBanners } from "@/components/ui/SetupBanners";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { TwoTone, type TwoTonePart } from "@/components/ui/TwoTone";
import {
  allConsentsDecided,
  firstUndecidedConsent,
  hrefForConsent,
} from "@/lib/consent-flow";
import {
  QUESTIONNAIRE_HUB_SECTIONS,
  type HubSectionKey,
} from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { colors, radius, spacing, status } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useConsentStore } from "@/stores/consent-store";
import {
  useQuestionnaireStore,
  completedSectionCount,
} from "@/stores/questionnaire-store";
import { useTriageStore } from "@/stores/triage-store";

/**
 * The one headline on the screen, split two-tone: read only the bold word and
 * it still says whose this is. Display copy lives beside the screen that
 * prints it, the way Home's next-step headlines do; `COPY.hubTitle` stays the
 * name of the screen for anything that needs one in prose.
 */
const HUB_HEADLINE: TwoTonePart[] = [
  { text: "Your ", tone: "bold" },
  { text: "assessment", tone: "grey" },
];

/** The counter under the headline. Big enough for the grey run to carry. */
const COUNTER_SIZE = 38;

/** Failure text borrows the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

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
  const decided = useConsentStore((state) => state.decided);
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

  // Each consent has to be answered; "no" is an answer.
  if (!consentLoading && loaded && !allConsentsDecided(decided)) {
    const next = firstUndecidedConsent(decided);
    return <Redirect href={next ? hrefForConsent(next) : routes.consentBrca} />;
  }

  const doneCount = completedSectionCount(progress);
  const total = QUESTIONNAIRE_HUB_SECTIONS.length;
  const ratio = total > 0 ? doneCount / total : 0;

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
    <Screen scroll contentPadding={spacing.screenX} centered={false}>
      <View accessibilityRole="header">
        <TwoTone size="xl" parts={HUB_HEADLINE} />
      </View>
      <Text style={styles.body}>{COPY.hubBody}</Text>

      {/*
        The count and the bar are one statement, so they read as one line to a
        screen reader rather than as "3", "slash ten", then a bare bar.
      */}
      <View
        style={styles.counterRow}
        accessible
        accessibilityLabel={`${COPY.hubProgressLabel}: ${doneCount} / ${total}`}
      >
        <TwoTone
          size={COUNTER_SIZE}
          parts={[
            { text: String(doneCount), tone: "bold" },
            { text: `/${total}`, tone: "grey" },
          ]}
        />
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
        </View>
      </View>

      <SetupBanners />
      {hubLoading ? <StaticSkeleton rows={4} /> : null}
      {hubError ? <Text style={styles.error}>{hubError}</Text> : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {!hubLoading ? (
        <SectionProgress progress={progress} onPressSection={openSection} />
      ) : null}
      {!hubLoading && hubError ? (
        <EmptyState
          icon="clipboard"
          heading={COPY.hubTitle}
          explanation={hubError}
        />
      ) : null}
      {doneCount >= total ? (
        <PrimaryButton
          title={COPY.hubOpenResults}
          onPress={() => {
            router.replace(routes.results);
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: 12,
    ...typography.body,
    color: colors.inkSoft,
  },
  counterRow: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.hairline,
    overflow: "hidden",
  },
  fill: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.mossDeep,
  },
  error: {
    marginTop: 12,
    ...typography.label,
    color: CLAY,
  },
  hint: {
    marginTop: 12,
    ...typography.label,
    color: colors.mossDeep,
  },
});
