import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { IconButton, TextButton } from "@/components/ui/Button";
import { ExploreGrid, type ExploreItem } from "@/components/ui/ExploreGrid";
import { BrcaReferralBanner } from "@/components/ui/BrcaReferralBanner";
import { HomeSkeleton } from "@/components/ui/HomeSkeleton";
import { HomeStatCards } from "@/components/ui/HomeStatCards";
import { TrustBanner } from "@/components/ui/TrustBanner";
import { JourneyProgressCard, type JourneyStepItem } from "@/components/ui/JourneyProgressCard";
import { Screen } from "@/components/ui/Screen";
import { SetupBanners } from "@/components/ui/SetupBanners";
import { TwoTone, type TwoTonePart } from "@/components/ui/TwoTone";
import {
  allConsentsDecided,
  firstUndecidedConsent,
  hrefForConsent,
} from "@/lib/consent-flow";
import { isAdminEmail } from "@/lib/constants";
import { COPY } from "@/lib/copy";
import {
  colors,
  heroGradient,
  radius,
  spacing,
  status,
  tapTarget,
} from "@/lib/design-tokens";
import { firstNameFrom, greetingFor } from "@/lib/greeting";
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
import { fontFamily, typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useConsentStore } from "@/stores/consent-store";
import {
  completedSectionCount,
  useQuestionnaireStore,
} from "@/stores/questionnaire-store";
import { useTriageStore } from "@/stores/triage-store";

/** Destructive and failure text borrows the clay of `worthDiscussing`. */
const CLAY = status.worthDiscussing.text;

/** 155deg on the unit box — the same band onboarding and auth use. */
const GRADIENT_START = { x: 0.29, y: 0.05 };
const GRADIENT_END = { x: 0.71, y: 0.95 };

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

/**
 * The next-step card's headline, one step per journey step, split two-tone:
 * the bold words name the thing waiting, the grey words carry the grammar.
 * Read only the bold words and the card still says what is next.
 *
 * These are short on purpose — they are display type, not instructions. The
 * full wording for each step, disclaimers and all, is `headlineFor` below and
 * prints in full as body copy underneath the card, never on the gradient.
 */
const NEXT_STEP_HEADLINE: Record<JourneyStepId, TwoTonePart[]> = {
  consents: [
    { text: "Three consents", tone: "bold" },
    { text: " are waiting to be read", tone: "grey" },
  ],
  questionnaire: [
    { text: "Ten sections", tone: "bold" },
    { text: " are waiting for your answers", tone: "grey" },
  ],
  tests: [
    { text: "Suggested tests", tone: "bold" },
    { text: " are waiting to be talked through", tone: "grey" },
  ],
  results: [
    { text: "Your results", tone: "bold" },
    { text: " are waiting in plain language", tone: "grey" },
  ],
  plan: [
    { text: "A draft plan", tone: "bold" },
    { text: " is waiting to be talked through", tone: "grey" },
  ],
  store: [
    { text: "Your plan", tone: "bold" },
    { text: " is ready to order from", tone: "grey" },
  ],
  followup: [
    { text: "Follow-up", tone: "bold" },
    { text: " is waiting when you are", tone: "grey" },
  ],
};

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

/** "Monday, 19 October" — micro-caps turns it upper at render time. */
function dateLabel(date: Date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * The greeting, split two-tone: the time of day in bold ink, the name in grey.
 *
 * `greetingFor` stays the single source of the words — called with no name it
 * returns the bare slot ("Good morning"), which is exactly the bold run, so
 * the sentence a screen reader hears is the one it always was.
 */
function greetingParts(fullName: unknown): TwoTonePart[] {
  const slot = greetingFor(null);
  const name = firstNameFrom(fullName);
  if (!name) {
    return [{ text: slot, tone: "bold" }];
  }
  return [
    { text: `${slot}, `, tone: "bold" },
    { text: name, tone: "grey" },
  ];
}

export default function HomeScreen() {
  const router = useRouter();
  const loading = useAuthStore((state) => state.loading);
  const session = useAuthStore((state) => state.session);
  const termsPrivacyAccepted = useAuthStore((state) => state.termsPrivacyAccepted);
  const onboardingCompleted = useAuthStore((state) => state.onboardingCompleted);
  const triageStatus = useTriageStore((state) => state.status);
  const decided = useConsentStore((state) => state.decided);
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

  // The consents step is done when each has been answered, yes or no.
  const consentsDone = allConsentsDecided(decided);
  const nextConsent = firstUndecidedConsent(decided);
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
  const primaryTitle = COPY[primary.titleKey];

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
        ? "All answered"
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

  // Consents ANSWERED, not agreed: a "no" is an answer, and counting only the
  // yeses would show someone who declined two as being 1 of 3 of the way there.
  const consentCount =
    (decided.brca ? 1 : 0) + (decided.ctc ? 1 : 0) + (decided.snp ? 1 : 0);

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
      <View style={styles.topRow}>
        <Text style={styles.date}>{dateLabel()}</Text>
        <IconButton
          icon="settings"
          accessibilityLabel="Settings"
          onPress={() => {
            router.push(routes.settings);
          }}
          // Pulls the 22pt glyph's 44pt hit area back onto the screen gutter
          // so the icon aligns with the content edge, not the tap target's.
          style={styles.settingsBtn}
        />
      </View>

      <View style={styles.greeting} accessibilityRole="header">
        <TwoTone size="xl" parts={greetingParts(session.user.user_metadata?.full_name)} />
      </View>

      {/*
        The one gradient on this screen. It carries the eyebrow, the two-tone
        headline and the affordance — and no body copy, which is why the full
        next-step wording sits underneath on paper.
      */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Your next step. ${NEXT_STEP_HEADLINE[current]
          .map((part) => part.text)
          .join("")}. ${primaryTitle}`}
        onPress={goPrimary}
        // A gradient has no flat fill to darken, so the press reads as a
        // slight settle. Not a scale, not a shadow — Moss has neither.
        style={({ pressed }) => [
          styles.nextCardWrap,
          pressed ? styles.nextCardPressed : null,
        ]}
      >
        <LinearGradient
          colors={heroGradient.colors}
          locations={heroGradient.locations}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={styles.nextCard}
        >
          <Text style={styles.eyebrow}>Your next step</Text>
          <View style={styles.nextHeadline}>
            <TwoTone size="l" onMoss parts={NEXT_STEP_HEADLINE[current]} />
          </View>
          <View style={styles.affordance}>
            <Text style={styles.affordanceLabel}>{primaryTitle}</Text>
            <Feather name="arrow-right" size={16} color={colors.white} />
          </View>
        </LinearGradient>
      </Pressable>

      {/* The step's full wording, disclaimers included. Never on the moss. */}
      <Text style={styles.nextBody}>{headlineFor(current)}</Text>

      <View style={styles.stats}>
        <HomeStatCards
          questionnaireCount={questionnaireCount}
          questionnaireTotal={10}
          consentCount={consentCount}
          consentTotal={3}
          testPlanReady={hasRecommendations && questionnaireCount >= 10}
          onPressQuestionnaire={() => {
            router.replace(routes.questionnaire);
          }}
        />
      </View>

      {/*
        One gap-ed column rather than a margin per block: the failure line and
        the BRCA banner each render nothing when they do not apply, and a child
        that renders nothing is not a flex item, so it leaves no hole behind.
      */}
      <View style={styles.lower}>
        {labCheckMessage ? (
          <Text style={styles.error}>{labCheckMessage}</Text>
        ) : null}

        <BrcaReferralBanner />

        <View>
          <Text style={styles.sectionLabel}>{COPY.homeJourneyTitle}</Text>
          <JourneyProgressCard steps={timeline} onContinue={goPrimary} />
        </View>

        {consentsDone && exploreItems.length > 0 ? (
          <View>
            <Text style={styles.sectionLabel}>{COPY.homeAlsoAvailable}</Text>
            <ExploreGrid items={exploreItems} />
          </View>
        ) : null}

        <TrustBanner />

        <SetupBanners />

        <Text style={styles.tagline}>{COPY.tagline}</Text>
      </View>

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
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: tapTarget,
  },
  date: {
    ...typography.micro,
    // 11px micro, so `inkMuted` — `inkFaint` is a headline colour from 24px.
    color: colors.inkMuted,
  },
  settingsBtn: {
    marginRight: -12,
  },
  greeting: {
    marginTop: 6,
  },
  nextCardWrap: {
    marginTop: 22,
    borderRadius: radius.surface,
    // The gradient paints to the radius, so the wrapper must clip to it.
    overflow: "hidden",
  },
  nextCardPressed: {
    opacity: 0.92,
  },
  nextCard: {
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 20,
  },
  eyebrow: {
    ...typography.micro,
    color: colors.mossTint,
  },
  nextHeadline: {
    marginTop: 12,
  },
  affordance: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    // The whole card is the hit area; this row only needs to clear the floor
    // on its own in case the card ever stops being pressable.
    minHeight: 24,
  },
  affordanceLabel: {
    ...typography.body,
    fontFamily: fontFamily.bodySemi,
    color: colors.white,
  },
  nextBody: {
    marginTop: 14,
    ...typography.body,
    color: colors.inkSoft,
  },
  stats: {
    marginTop: 14,
  },
  lower: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  sectionLabel: {
    marginBottom: spacing.mdSm,
    ...typography.micro,
    color: colors.inkMuted,
  },
  error: {
    ...typography.label,
    color: CLAY,
  },
  tagline: {
    ...typography.label,
    // 13px regulatory disclaimer — `inkMuted` keeps it AA-legible on paper.
    color: colors.inkMuted,
  },
});
