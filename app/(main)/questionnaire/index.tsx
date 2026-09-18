import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { SectionProgress } from "@/components/questionnaire/SectionProgress";
import { PrimaryButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LogoMark } from "@/components/ui/LogoMark";
import { Screen } from "@/components/ui/Screen";
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
import { colors, spacing } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useConsentStore } from "@/stores/consent-store";
import {
  useQuestionnaireStore,
  completedSectionCount,
} from "@/stores/questionnaire-store";
import { useTriageStore } from "@/stores/triage-store";

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
    <Screen contentPadding={spacing.screenX} centered={false}>
      <FlatList
        data={[]}
        keyExtractor={() => "hub"}
        renderItem={() => null}
        ListHeaderComponent={
          <View>
            <View style={styles.trail}>
              <LogoMark size={72} />
            </View>
            <Text style={styles.title} accessibilityRole="header">
              {COPY.hubTitle}
            </Text>
            <Text style={styles.body}>{COPY.hubBody}</Text>
            <Text style={styles.progress}>
              {COPY.hubProgressLabel}: {doneCount} / {total}
            </Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${total > 0 ? (doneCount / total) * 100 : 0}%` },
                ]}
              />
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
          </View>
        }
        ListFooterComponent={
          doneCount >= total ? (
            <PrimaryButton
              title={COPY.hubOpenResults}
              onPress={() => {
                router.replace(routes.results);
              }}
            />
          ) : null
        }
        keyboardShouldPersistTaps="handled"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  trail: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.6,
    color: colors.deepTeal,
    textAlign: "left",
  },
  body: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
    textAlign: "left",
  },
  progress: {
    marginTop: 16,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.slate,
    textAlign: "left",
  },
  track: {
    marginTop: 8,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: 4,
    backgroundColor: colors.sage,
  },
  error: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.coral,
    textAlign: "center",
  },
  hint: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.midTeal,
    textAlign: "center",
  },
});
