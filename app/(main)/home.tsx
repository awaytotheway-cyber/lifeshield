import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { MenuButton } from "@/components/navigation/MenuButton";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { GoalsSummaryCard } from "@/components/ui/GoalsSummaryCard";
import { MilestoneStatStrip } from "@/components/ui/MilestoneStatStrip";
import { PillFeatureGrid } from "@/components/ui/PillFeatureGrid";
import {
  QuickActionGrid,
  type QuickAction,
} from "@/components/ui/QuickActionGrid";
import { TrustBanner } from "@/components/ui/TrustBanner";
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
  const termsPrivacyAccepted = useAuthStore((state) => state.termsPrivacyAccepted);
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

  if (!termsPrivacyAccepted) {
    return <Redirect href={routes.consentPrivacy} />;
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

  const consentCount = (agreed.brca ? 1 : 0) + (agreed.ctc ? 1 : 0) + (agreed.snp ? 1 : 0);

  const milestoneStats: [
    { id: string; value: string | number; label: string },
    { id: string; value: string | number; label: string },
    { id: string; value: string | number; label: string },
  ] = [
    {
      id: "sections",
      value: `${questionnaireCount}/10`,
      label: COPY.homeMilestoneQuestionnaire,
    },
    { id: "consents", value: `${consentCount}/3`, label: COPY.homeMilestoneConsents },
    {
      id: "tests",
      value: hasRecommendations ? COPY.homeMilestoneReady : COPY.homeMilestoneSoon,
      label: COPY.homeMilestoneTestPlan,
    },
  ];

  const homeFeatures = [
    { id: "science", label: COPY.homeFeatureScience, icon: "cpu" as const },
    { id: "private", label: COPY.homeFeaturePrivate, icon: "lock" as const },
    { id: "calm", label: COPY.homeFeatureCalm, icon: "heart" as const },
    { id: "track", label: COPY.homeFeatureTrack, icon: "map" as const },
  ];

  // Secondary destinations as a scannable grid rather than a stack of
  // identically weighted text links. Each entry keeps the visibility rule it
  // had as a link: only offer somewhere the user can actually act on, and
  // never the step they are already on.
  const quickActions: QuickAction[] = [];
  if (consentsDone) {
    if (current !== "questionnaire") {
      quickActions.push({
        id: "questionnaire",
        label: COPY.homeOpenQuestionnaire,
        icon: "clipboard",
        onPress: () => router.replace(routes.questionnaire),
      });
    }
    if ((hasRecommendations || questionnaireCount >= 10) && current !== "tests") {
      quickActions.push({
        id: "results",
        label: COPY.homeOpenResults,
        icon: "check-circle",
        onPress: () => router.replace(routes.results),
      });
    }
    if (hasLabResults && current !== "results") {
      quickActions.push({
        id: "labResults",
        label: COPY.homeOpenLabResults,
        icon: "activity",
        onPress: () => router.push(routes.labResults),
      });
    }
    if ((hasLabResults || hasPlan) && current !== "plan") {
      quickActions.push({
        id: "plan",
        label: COPY.homeOpenPlan,
        icon: "list",
        onPress: () => router.push(routes.plan),
      });
    }
    if (hasPlan && current !== "store") {
      quickActions.push({
        id: "store",
        label: COPY.homeOpenStore,
        icon: "shopping-bag",
        onPress: () => router.push(routes.store),
      });
    }
    if (hasStoreOrders && current !== "followup") {
      quickActions.push({
        id: "orders",
        label: COPY.homeOpenOrders,
        icon: "package",
        onPress: () => router.push(routes.orders),
      });
    }
    if (hasPlan && current !== "followup") {
      quickActions.push({
        id: "followup",
        label: COPY.homeOpenFollowUp,
        icon: "calendar",
        onPress: () => router.push(routes.followUp),
      });
    }
  }

  return (
    <Screen scroll contentPadding={spacing.screenX}>
      <View style={styles.menuRow}>
        <MenuButton />
        <Text style={styles.brand}>{COPY.appName}</Text>
      </View>
      <Text style={styles.tagline}>{COPY.tagline}</Text>
      <Text style={styles.headline}>{headlineFor(current)}</Text>

      <View style={styles.trust}>
        <TrustBanner />
      </View>

      <View style={styles.stats}>
        <MilestoneStatStrip stats={milestoneStats} />
      </View>

      <View style={styles.features}>
        <PillFeatureGrid features={homeFeatures} />
      </View>

      <Text style={styles.section}>{COPY.homeJourneyTitle}</Text>
      <View style={styles.timeline}>
        <JourneyProgressCard steps={timeline} onContinue={goPrimary} />
      </View>

      {consentsDone ? <GoalsSummaryCard userId={session.user.id} /> : null}

      {labCheckMessage ? (
        <Text style={styles.error}>{labCheckMessage}</Text>
      ) : null}

      <SetupBanners />

      <Text style={styles.hint}>{COPY.homePrimaryHint}</Text>
      <PrimaryButton title={COPY[primary.titleKey]} onPress={goPrimary} />

      {quickActions.length > 0 ? (
        <>
          <Text style={styles.also}>{COPY.homeAlsoAvailable}</Text>
          <View style={styles.quickActions}>
            <QuickActionGrid actions={quickActions} />
          </View>
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
  quickActions: {
    marginTop: spacing.mdSm,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  brand: {
    flex: 1,
    fontFamily: fontFamily.display,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.6,
    color: colors.primaryBlue,
    textAlign: "left",
  },
  trust: {
    marginTop: 20,
  },
  stats: {
    marginTop: 16,
  },
  features: {
    marginTop: 16,
  },
  tagline: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
    textAlign: "left",
  },
  headline: {
    marginTop: 16,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.charcoal,
    textAlign: "left",
  },
  section: {
    marginTop: 24,
    marginBottom: 12,
    fontFamily: fontFamily.bodySemi,
    fontSize: 20,
    color: colors.primaryBlue,
    textAlign: "left",
  },
  timeline: {
    marginBottom: 8,
  },
  error: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.riskHighText,
    textAlign: "left",
  },
  hint: {
    marginTop: 16,
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.slate,
    textAlign: "left",
  },
  also: {
    marginTop: 24,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.slate,
    textAlign: "left",
  },
});

