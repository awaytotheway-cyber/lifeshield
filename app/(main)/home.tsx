import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { MenuButton } from "@/components/navigation/MenuButton";
import { ActionCard } from "@/components/ui/ActionCard";
import { TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DotProgress, type DotState } from "@/components/ui/DotProgress";
import { Hero } from "@/components/ui/Hero";
import { PressScale } from "@/components/ui/PressScale";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { SetupBanners } from "@/components/ui/SetupBanners";
import { StatCard } from "@/components/ui/StatCard";
import {
  allConsentsAgreed,
  firstIncompleteConsent,
  hrefForConsent,
} from "@/lib/consent-flow";
import { isAdminEmail } from "@/lib/constants";
import { COPY } from "@/lib/copy";
import {
  currentJourneyStep,
  isJourneyStepComplete,
  primaryJourneyAction,
  type JourneyProgress,
  type JourneyStepId,
} from "@/lib/journey";
import { hasOwnStoreOrders } from "@/lib/orders";
import { hasOwnInterventions } from "@/lib/plan";
import { routes } from "@/lib/routes";
import { hasOwnTestResults } from "@/lib/test-results";
import { Colors, Gap, Motion, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";
import { useConsentStore } from "@/stores/consent-store";
import {
  completedSectionCount,
  useQuestionnaireStore,
} from "@/stores/questionnaire-store";
import { useTriageStore } from "@/stores/triage-store";

/** Every stage of the closed loop, in order — one dot each. */
const JOURNEY_STEPS: { id: JourneyStepId; label: string }[] = [
  { id: "consents", label: COPY.homeStepConsents },
  { id: "questionnaire", label: COPY.homeStepQuestionnaire },
  { id: "tests", label: COPY.homeStepTests },
  { id: "results", label: COPY.homeStepLabResults },
  { id: "plan", label: COPY.homeStepPlan },
  { id: "store", label: COPY.homeStepOrderTrack },
  { id: "followup", label: COPY.homeStepFollowUp },
];

const STEP_ICONS: Record<JourneyStepId, keyof typeof Feather.glyphMap> = {
  consents: "shield",
  questionnaire: "clipboard",
  tests: "check-circle",
  results: "bar-chart-2",
  plan: "list",
  store: "shopping-bag",
  followup: "refresh-cw",
};

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

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return COPY.homeGreetingMorning;
  }
  if (hour < 18) {
    return COPY.homeGreetingAfternoon;
  }
  return COPY.homeGreetingEvening;
}

/** First name from the sign-up metadata. Empty when we genuinely don't know it. */
function firstNameFrom(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? "";
  return first;
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
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>{COPY.authLoading}</Text>
      </View>
    );
  }

  // ——— Journey safety gates — unchanged, do not reorder. ———
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
  const currentIndex = JOURNEY_STEPS.findIndex((step) => step.id === current);

  const dots: DotState[] = JOURNEY_STEPS.map((step, index) => {
    if (isJourneyStepComplete(step.id, journey)) {
      return "complete";
    }
    if (step.id === current) {
      return "current";
    }
    return index < currentIndex ? "complete" : "upcoming";
  });

  const currentStepLabel =
    JOURNEY_STEPS[currentIndex]?.label ?? COPY.homeJourneyTitle;
  const stepCounter = COPY.homeJourneyStepOf
    .replace("{current}", String(currentIndex + 1))
    .replace("{total}", String(JOURNEY_STEPS.length));
  const questionnaireSuffix =
    current === "questionnaire" ? ` — ${questionnaireCount}/10` : "";

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

  // "Today" — the one next step, plus whatever is genuinely available now.
  const todayCards: {
    id: string;
    title: string;
    subtitle: string;
    icon: keyof typeof Feather.glyphMap;
    onPress: () => void;
  }[] = [
    {
      id: "next",
      title: COPY[primary.titleKey],
      subtitle: headlineFor(current),
      icon: STEP_ICONS[current],
      onPress: goPrimary,
    },
  ];

  if (hasLabResults && current !== "results") {
    todayCards.push({
      id: "results",
      title: COPY.homeTodayResultsTitle,
      subtitle: COPY.homeTodayResultsSubtitle,
      icon: "bar-chart-2",
      onPress: () => router.push(routes.labResults),
    });
  }

  if (hasPlan && current !== "plan") {
    todayCards.push({
      id: "plan",
      title: COPY.homeTodayPlanTitle,
      subtitle: COPY.homeTodayPlanSubtitle,
      icon: "list",
      onPress: () => router.push(routes.plan),
    });
  }

  if (consentsDone && todayCards.length < 3) {
    todayCards.push({
      id: "goals",
      title: COPY.homeTodayGoalsTitle,
      subtitle: COPY.homeTodayGoalsSubtitle,
      icon: "target",
      onPress: () => router.push(routes.goals),
    });
  }

  const consentCount =
    (agreed.brca ? 1 : 0) + (agreed.ctc ? 1 : 0) + (agreed.snp ? 1 : 0);

  const metadata = session.user.user_metadata as
    | { full_name?: string }
    | undefined;
  const firstName = firstNameFrom(metadata?.full_name ?? "");

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Hero
          eyebrow={greeting()}
          title={firstName || COPY.homeGreetingFallbackName}
          subtitle={COPY.tagline}
          action={<MenuButton />}
          style={styles.hero}
        />

        {/* Floating feature card, overlapping the hero's bottom edge. */}
        <View style={styles.featureWrap}>
          <Card elevated>
            <Text style={styles.featureTitle}>{COPY.homeJourneyTitle}</Text>
            <View style={styles.dots}>
              <DotProgress states={dots} accessibilityLabel={stepCounter} />
            </View>
            <Text style={styles.stepCounter}>{stepCounter}</Text>
            <Text style={styles.stepLabel}>
              {currentStepLabel}
              {questionnaireSuffix}
            </Text>
            <PressScale
              accessibilityRole="button"
              accessibilityLabel={COPY[primary.titleKey]}
              onPress={goPrimary}
              scale={Motion.pressCard}
              haptic="medium"
              style={styles.continueHit}
            >
              <Text style={styles.continueText}>{COPY.homeContinueLink}</Text>
            </PressScale>
          </Card>
        </View>

        <View style={styles.body}>
          <SetupBanners />
          {labCheckMessage ? (
            <Text style={styles.error}>{labCheckMessage}</Text>
          ) : null}

          <SectionTitle title={COPY.homeTodayTitle} topGap={Space.xxl + 4} />
          <View style={styles.cardStack}>
            {todayCards.map((card) => (
              <ActionCard
                key={card.id}
                title={card.title}
                subtitle={card.subtitle}
                icon={card.icon}
                onPress={card.onPress}
              />
            ))}
          </View>

          <SectionTitle title={COPY.homeNumbersTitle} topGap={Space.xxl + 4} />
          <View style={styles.statRow}>
            <StatCard
              value={`${questionnaireCount}/10`}
              label={COPY.homeNumberQuestionnaire}
              onPress={
                consentsDone
                  ? () => router.replace(routes.questionnaire)
                  : undefined
              }
            />
            <StatCard
              value={`${consentCount}/3`}
              label={COPY.homeNumberConsents}
            />
            <StatCard
              value={
                hasRecommendations
                  ? COPY.homeTestPlanReady
                  : COPY.homeNumberPending
              }
              label={COPY.homeNumberTestPlan}
              onPress={
                hasRecommendations
                  ? () => router.replace(routes.results)
                  : undefined
              }
            />
          </View>

          {isAdminEmail(session.user.email) ? (
            <View style={styles.adminBlock}>
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
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    // Section 10: generous bottom padding — the screen never feels full.
    paddingBottom: Gap.screenBottom,
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    paddingHorizontal: Space.screenH,
  },
  loadingText: {
    ...typeStyle("body"),
    color: Colors.body,
    textAlign: "center",
  },
  hero: {
    // Extra bottom room so the feature card can overlap the wash.
    paddingBottom: Space.xxl,
  },
  featureWrap: {
    paddingHorizontal: Space.screenH,
    marginTop: -Space.xl,
  },
  featureTitle: {
    ...typeStyle("title"),
    color: Colors.ink,
  },
  dots: {
    marginTop: Space.lg,
  },
  stepCounter: {
    ...typeStyle("label"),
    marginTop: Space.lg,
    color: Colors.muted,
  },
  stepLabel: {
    ...typeStyle("cardTitle"),
    marginTop: Space.xs,
    color: Colors.ink,
  },
  continueHit: {
    marginTop: Space.md,
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    paddingRight: Space.sm,
  },
  continueText: {
    ...typeStyle("cardTitle"),
    color: Colors.orange,
  },
  body: {
    paddingHorizontal: Space.screenH,
  },
  error: {
    ...typeStyle("secondary"),
    marginTop: Space.md,
    color: Colors.red,
  },
  cardStack: {
    // Section 10: 16px minimum between stacked cards.
    gap: Gap.cards,
  },
  statRow: {
    flexDirection: "row",
    gap: Gap.cards,
  },
  adminBlock: {
    marginTop: Gap.sections,
  },
});
