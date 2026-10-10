import { Feather } from "@expo/vector-icons";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { MenuButton } from "@/components/navigation/MenuButton";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { ExploreGrid, type ExploreItem } from "@/components/ui/ExploreGrid";
import { HomeSkeleton } from "@/components/ui/HomeSkeleton";
import { HomeStatCards } from "@/components/ui/HomeStatCards";
import { TrustBadgeGrid } from "@/components/ui/TrustBadgeGrid";
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
import { greetingFor } from "@/lib/greeting";
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

const LOOP_LABELS: {
  id: JourneyStepId;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  { id: "questionnaire", label: COPY.homeStepQuestionnaire, icon: "clipboard" },
  { id: "tests", label: COPY.homeStepTests, icon: "droplet" },
  { id: "results", label: COPY.homeStepLabResults, icon: "bar-chart-2" },
  { id: "plan", label: COPY.homeStepPlan, icon: "heart" },
  { id: "store", label: COPY.homeStepOrderTrack, icon: "package" },
  { id: "followup", label: COPY.homeStepFollowUp, icon: "calendar" },
];

const TRUST_BADGES = [
  {
    id: "science",
    label: "Science-backed",
    description: "Rules from published guidance",
    icon: "cpu" as const,
    color: colors.primaryBlue,
    tint: colors.iceBlue,
  },
  {
    id: "private",
    label: "Private by default",
    description: "Row-level security on every row",
    icon: "lock" as const,
    color: colors.sage,
    tint: colors.sageLight,
  },
  {
    id: "calm",
    label: "Calm, clear steps",
    description: "One next action at a time",
    icon: "heart" as const,
    color: colors.coral,
    tint: colors.coralLight,
  },
  {
    id: "track",
    label: "Track your journey",
    description: "See progress as you go",
    icon: "trending-up" as const,
    color: colors.amber,
    tint: colors.amberLight,
  },
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
      <Screen scroll contentPadding={spacing.screenX}>
        <HomeSkeleton />
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
      icon: "shield",
      subtitle: "Cleared",
    },
    {
      id: "consents",
      title: COPY.homeStepConsents,
      state: consentsDone ? "complete" : "current",
      icon: "file-text",
      subtitle: consentsDone
        ? "All signed"
        : nextConsent
          ? `Next: ${nextConsent.toUpperCase()}`
          : undefined,
    },
    ...LOOP_LABELS.map((item) => {
      const state = journeyState(
        loopStepState(item.id, current, journey),
        item.id,
        journey,
      );
      // Only the questionnaire carries a count; the lock icon already says
      // "not yet" for the rest, so repeating it on every row is just noise.
      const subtitle =
        item.id === "questionnaire"
          ? `${questionnaireCount} of 10 sections`
          : undefined;
      return {
        id: item.id,
        title: item.label,
        state,
        icon: item.icon,
        subtitle,
      };
    }),
  ];

  const consentCount = (agreed.brca ? 1 : 0) + (agreed.ctc ? 1 : 0) + (agreed.snp ? 1 : 0);

  // Secondary destinations, gated by the same rules the old text links used.
  const exploreItems: ExploreItem[] = [
    {
      show: current !== "questionnaire",
      id: "questionnaire",
      label: COPY.homeOpenQuestionnaire,
      icon: "clipboard" as const,
      go: () => router.replace(routes.questionnaire),
    },
    {
      show:
        (hasRecommendations || questionnaireCount >= 10) && current !== "tests",
      id: "results",
      label: COPY.homeOpenResults,
      icon: "list" as const,
      go: () => router.replace(routes.results),
    },
    {
      show: hasLabResults && current !== "results",
      id: "labResults",
      label: COPY.homeOpenLabResults,
      icon: "droplet" as const,
      go: () => router.push(routes.labResults),
    },
    {
      show: (hasLabResults || hasPlan) && current !== "plan",
      id: "plan",
      label: COPY.homeOpenPlan,
      icon: "heart" as const,
      go: () => router.push(routes.plan),
    },
    {
      show: hasPlan && current !== "store",
      id: "store",
      label: COPY.homeOpenStore,
      icon: "shopping-bag" as const,
      go: () => router.push(routes.store),
    },
    {
      show: hasStoreOrders && current !== "followup",
      id: "orders",
      label: COPY.homeOpenOrders,
      icon: "package" as const,
      go: () => router.push(routes.orders),
    },
    {
      show: hasPlan && current !== "followup",
      id: "followUp",
      label: COPY.homeOpenFollowUp,
      icon: "calendar" as const,
      go: () => router.push(routes.followUp),
    },
  ]
    .filter((item) => item.show)
    .map(({ id, label, icon, go }) => ({ id, label, icon, onPress: go }));

  return (
    <Screen scroll contentPadding={spacing.screenX}>
      <View style={styles.menuRow}>
        <MenuButton />
        <Text style={styles.brand}>{COPY.appName}</Text>
      </View>

      <Text style={styles.greeting}>
        {greetingFor(session.user.user_metadata?.full_name)}
      </Text>
      <Text style={styles.greetingSub}>{COPY.homeGreetingSub}</Text>
      <Text style={styles.tagline}>{COPY.tagline}</Text>
      <Text style={styles.headline}>{headlineFor(current)}</Text>

      <View style={styles.trust}>
        <TrustBanner />
      </View>

      <View style={styles.stats}>
        <HomeStatCards
          questionnaireCount={questionnaireCount}
          questionnaireTotal={10}
          consentCount={consentCount}
          consentTotal={3}
          testPlanReady={hasRecommendations}
          onPressQuestionnaire={() => {
            router.replace(routes.questionnaire);
          }}
        />
      </View>

      <View style={styles.features}>
        <TrustBadgeGrid badges={TRUST_BADGES} />
      </View>

      <Text style={styles.section}>{COPY.homeJourneyTitle}</Text>
      <View style={styles.timeline}>
        <JourneyProgressCard steps={timeline} onContinue={goPrimary} />
      </View>

      {labCheckMessage ? (
        <Text style={styles.error}>{labCheckMessage}</Text>
      ) : null}

      <SetupBanners />

      <Text style={styles.ctaHeading}>{COPY.homePrimaryHint}</Text>
      <PrimaryButton
        title={COPY[primary.titleKey]}
        iconTrailing="arrow-right"
        onPress={goPrimary}
      />

      {consentsDone && exploreItems.length > 0 ? (
        <>
          <Text style={styles.also}>{COPY.homeAlsoAvailable}</Text>
          <ExploreGrid items={exploreItems} />
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
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  brand: {
    flex: 1,
    fontFamily: fontFamily.displaySemi,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.6,
    color: colors.primaryBlue,
    textAlign: "left",
  },
  greeting: {
    marginTop: 20,
    fontFamily: fontFamily.display,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: colors.deepNavy,
    textAlign: "left",
  },
  greetingSub: {
    marginTop: 4,
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.slate,
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
    marginTop: 10,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 18,
    // Regulatory disclaimer — keep at slate or darker so it stays
    // WCAG AA legible. colors.mist fails contrast on the iceBlue screen.
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
    color: colors.coral,
    textAlign: "left",
  },
  ctaHeading: {
    marginTop: 24,
    marginBottom: 12,
    fontFamily: fontFamily.display,
    fontSize: 16,
    lineHeight: 22,
    color: colors.deepNavy,
    textAlign: "left",
  },
  also: {
    marginTop: 24,
    marginBottom: 12,
    fontFamily: fontFamily.displaySemi,
    fontSize: 14,
    lineHeight: 20,
    color: colors.slate,
    textAlign: "left",
  },
});

