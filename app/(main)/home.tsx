import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { JourneyProgressCard, type JourneyStepItem } from "@/components/ui/JourneyProgressCard";
import { Screen } from "@/components/ui/Screen";
import { SetupBanners } from "@/components/ui/SetupBanners";
import {
  allConsentsAgreed,
  firstIncompleteConsent,
  hrefForConsent,
} from "@/lib/consent-flow";
import { isAdminEmail } from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { colors, spacing } from "@/lib/design-tokens";
import {
  currentJourneyStep,
  isJourneyStepComplete,
  loopStepState,
  primaryJourneyAction,
  type JourneyProgress,
  type JourneyRowState,
  type JourneyStepId,
} from "@/lib/journey";
import { hasOwnInterventions } from "@/lib/plan";
import { hasOwnStoreOrders } from "@/lib/orders";
import { routes } from "@/lib/routes";
import { hasOwnTestResults } from "@/lib/test-results";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useConsentStore } from "@/stores/consent-store";
import {
  completedSectionCount,
  useQuestionnaireStore,
} from "@/stores/questionnaire-store";
import { useTriageStore } from "@/stores/triage-store";

const LOOP_LABELS: { id: JourneyStepId; label: string }[] = [
  { id: "questionnaire", label: COPY.homeStepQuestionnaire },
  { id: "tests", label: COPY.homeStepTests },
  { id: "results", label: COPY.homeStepLabResults },
  { id: "plan", label: COPY.homeStepPlan },
  { id: "store", label: COPY.homeStepOrderTrack },
  { id: "followup", label: COPY.homeStepFollowUp },
];

function journeyState(
  state: JourneyRowState,
  step: JourneyStepId,
  progress: JourneyProgress,
): JourneyStepItem["state"] {
  if (state === "done" || isJourneyStepComplete(step, progress)) {
    return "complete";
  }
  if (state === "current") {
    return "current";
  }
  return "upcoming";
}

function headlineFor(step: JourneyStepId): string {
  switch (step) {
    case "consents":
      return COPY.homeNextConsents;
    case "questionnaire":
      return COPY.homeNextQuestionnaire;
    case "tests":
      return COPY.homeNextResults;
    case "results":
      return COPY.homeNextLabResults;
    case "plan":
      return COPY.homeNextPlan;
    case "store":
      return COPY.homeNextStore;
    case "followup":
      return COPY.homeNextFollowUp;
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const loading = useAuthStore((state) => state.loading);
  const session = useAuthStore((state) => state.session);
  const onboardingCompleted = useAuthStore((state) => state.onboardingCompleted);
  const triageStatus = useTriageStore((state) => state.status);
  const agreed = useConsentStore((state) => state.agreed);
  const progress = useQuestionnaireStore((state) => state.progress);
  const hasRecommendations = useQuestionnaireStore(
    (state) => state.hasRecommendations,
  );
  const loadQuestionnaire = useQuestionnaireStore((state) => state.load);
  const signOut = useAuthStore((state) => state.signOut);
  const [hasLabResults, setHasLabResults] = useState(false);
  const [hasPlan, setHasPlan] = useState(false);
  const [hasStoreOrders, setHasStoreOrders] = useState(false);
  const [labCheckMessage, setLabCheckMessage] = useState<string | null>(null);

  const refreshProgress = useCallback(() => {
    const userId = session?.user.id;
    if (!userId) {
      setHasLabResults(false);
      setHasPlan(false);
      setHasStoreOrders(false);
      return () => {};
    }
    let cancelled = false;
    void loadQuestionnaire(userId);
    void (async () => {
      try {
        const [result, plan, ordersCheck] = await Promise.all([
          hasOwnTestResults(userId),
          hasOwnInterventions(userId),
          hasOwnStoreOrders(userId),
        ]);
        if (cancelled) {
          return;
        }
        if (!result.ok) {
          setHasLabResults(false);
          setLabCheckMessage(result.message ?? COPY.labResultsLoadFailed);
        } else {
          setHasLabResults(result.hasRows);
          setLabCheckMessage(null);
        }
        if (!plan.ok) {
          setHasPlan(false);
          if (result.ok) {
            setLabCheckMessage(plan.message ?? COPY.planLoadFailed);
          }
        } else {
          setHasPlan(plan.hasRows);
        }
        if (!ordersCheck.ok) {
          setHasStoreOrders(false);
        } else {
          setHasStoreOrders(ordersCheck.hasRows);
        }
      } catch {
        if (!cancelled) {
          setHasLabResults(false);
          setHasPlan(false);
          setHasStoreOrders(false);
          setLabCheckMessage(COPY.labResultsLoadFailed);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id, loadQuestionnaire]);

  useFocusEffect(refreshProgress);

  if (loading) {
    return (
      <Screen>
        <Text style={styles.loading}>{COPY.authLoading}</Text>
      </Screen>
    );
  }

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (!onboardingCompleted) {
    return <Redirect href={routes.welcome} />;
  }

  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  const consentsDone = allConsentsAgreed(agreed);
  const nextConsent = firstIncompleteConsent(agreed);
  const questionnaireCount = completedSectionCount(progress);

  const journey: JourneyProgress = {
    consentsDone,
    questionnaireCount,
    hasRecommendations,
    hasLabResults,
    hasPlan,
    hasStoreOrders,
  };
  const current = currentJourneyStep(journey);
  const primary = primaryJourneyAction(journey);

  const goPrimary = () => {
    switch (primary.href) {
      case "consent":
        router.replace(
          nextConsent ? hrefForConsent(nextConsent) : routes.consentBrca,
        );
        return;
      case "questionnaire":
        router.replace(routes.questionnaire);
        return;
      case "results":
        router.replace(routes.results);
        return;
      case "labResults":
        router.push(routes.labResults);
        return;
      case "plan":
        router.push(routes.plan);
        return;
      case "store":
        router.push(routes.store);
        return;
      case "orders":
        router.push(routes.orders);
        return;
      case "followUp":
        router.push(routes.followUp);
        return;
    }
  };

  const timeline: JourneyStepItem[] = [
    {
      id: "safety",
      title: COPY.homeStepSafety,
      state: "complete",
    },
    {
      id: "consents",
      title: `${COPY.homeStepConsents}${consentsDone ? "" : nextConsent ? ` — ${nextConsent}` : ""}`,
      state: consentsDone ? "complete" : "current",
    },
    ...LOOP_LABELS.map((item) => {
      const extra =
        item.id === "questionnaire" ? ` — ${questionnaireCount}/10` : "";
      return {
        id: item.id,
        title: `${item.label}${extra}`,
        state: journeyState(loopStepState(item.id, current, journey), item.id, journey),
      };
    }),
  ];

  return (
    <Screen scroll contentPadding={spacing.screenX}>
      <Text style={styles.brand}>{COPY.appName}</Text>
      <Text style={styles.tagline}>{COPY.tagline}</Text>
      <Text style={styles.headline}>{headlineFor(current)}</Text>

      <Text style={styles.section}>{COPY.homeJourneyTitle}</Text>
      <View style={styles.timeline}>
        <JourneyProgressCard steps={timeline} onContinue={goPrimary} />
      </View>

      {labCheckMessage ? (
        <Text style={styles.error}>{labCheckMessage}</Text>
      ) : null}

      <SetupBanners />

      <Text style={styles.hint}>{COPY.homePrimaryHint}</Text>
      <PrimaryButton title={COPY[primary.titleKey]} onPress={goPrimary} />

      {consentsDone ? (
        <>
          <Text style={styles.also}>{COPY.homeAlsoAvailable}</Text>
          {current !== "questionnaire" ? (
            <TextButton
              title={COPY.homeOpenQuestionnaire}
              onPress={() => {
                router.replace(routes.questionnaire);
              }}
            />
          ) : null}
          {hasRecommendations || questionnaireCount >= 10 ? (
            current !== "tests" ? (
              <TextButton
                title={COPY.homeOpenResults}
                onPress={() => {
                  router.replace(routes.results);
                }}
              />
            ) : null
          ) : null}
          {hasLabResults && current !== "results" ? (
            <TextButton
              title={COPY.homeOpenLabResults}
              onPress={() => {
                router.push(routes.labResults);
              }}
            />
          ) : null}
          {(hasLabResults || hasPlan) && current !== "plan" ? (
            <TextButton
              title={COPY.homeOpenPlan}
              onPress={() => {
                router.push(routes.plan);
              }}
            />
          ) : null}
          {hasPlan && current !== "store" ? (
            <TextButton
              title={COPY.homeOpenStore}
              onPress={() => {
                router.push(routes.store);
              }}
            />
          ) : null}
          {hasStoreOrders && current !== "followup" ? (
            <TextButton
              title={COPY.homeOpenOrders}
              onPress={() => {
                router.push(routes.orders);
              }}
            />
          ) : null}
          {hasPlan && current !== "followup" ? (
            <TextButton
              title={COPY.homeOpenFollowUp}
              onPress={() => {
                router.push(routes.followUp);
              }}
            />
          ) : null}
        </>
      ) : null}

      {isAdminEmail(session.user.email) ? (
        <>
          <TextButton
            title={COPY.homeEnterResults}
            onPress={() => {
              router.push(routes.enterResults);
            }}
          />
          <TextButton
            title={COPY.homeClinicalTermPreview}
            onPress={() => {
              router.push(routes.clinicalTermPreview);
            }}
          />
        </>
      ) : null}

      <TextButton
        title={COPY.signOut}
        onPress={() => {
          void signOut();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.charcoal,
    textAlign: "center",
  },
  brand: {
    fontFamily: fontFamily.display,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
    color: colors.deepTeal,
    textAlign: "center",
  },
  tagline: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
    textAlign: "center",
  },
  headline: {
    marginTop: 16,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.charcoal,
    textAlign: "center",
  },
  section: {
    marginTop: 24,
    marginBottom: 12,
    fontFamily: fontFamily.bodySemi,
    fontSize: 20,
    color: colors.deepTeal,
    textAlign: "center",
  },
  timeline: {
    marginBottom: 8,
  },
  error: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.coral,
    textAlign: "center",
  },
  hint: {
    marginTop: 16,
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.slate,
    textAlign: "center",
  },
  also: {
    marginTop: 24,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.slate,
    textAlign: "center",
  },
});

