import { Redirect, Tabs, usePathname } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";

import { GateLoading } from "@/components/journey/PostAuthRedirect";
import { TabIcon } from "@/components/navigation/TabIcon";
import {
  allConsentsAgreed,
  firstIncompleteConsent,
  hrefForConsent,
  redirectIfConsentOutOfOrder,
  type SequentialConsent,
} from "@/lib/consent-flow";
import { colors, spacing } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useConsentStore } from "@/stores/consent-store";
import { useEscalationStore } from "@/stores/escalation-store";
import { useTriageStore } from "@/stores/triage-store";

function consentScreenFromPath(pathname: string): SequentialConsent | null {
  if (pathname.includes("brca")) {
    return "brca";
  }
  if (pathname.includes("ctc")) {
    return "ctc";
  }
  if (pathname.includes("snp")) {
    return "snp";
  }
  return null;
}

/**
 * Home / Tests / Shop / Buddies / More — the five tabs, and no second
 * navigation model beside them. Everything else in this group (symptom check,
 * consents, the assessment, plan, follow-up, orders and the settings
 * sub-screens) is reachable by route but hidden from the bar; the assessment
 * is reached from Home's next-step card.
 *
 * Which tabs show is a presentation decision. Who is allowed where is decided
 * by the gates below, and they are independent: a hidden tab is not a gate,
 * and every redirect here still runs for a route typed in by hand.
 */
export default function MainLayout() {
  const session = useAuthStore((state) => state.session);
  const termsPrivacyAccepted = useAuthStore((state) => state.termsPrivacyAccepted);
  const onboardingCompleted = useAuthStore((state) => state.onboardingCompleted);
  const authLoading = useAuthStore((state) => state.loading);
  const triageLoading = useTriageStore((state) => state.loading);
  const triageStatus = useTriageStore((state) => state.status);
  const consentLoaded = useConsentStore((state) => state.loaded);
  const agreed = useConsentStore((state) => state.agreed);
  const ctcPositive = useEscalationStore((state) => state.state.ctcPositive);
  const loadEscalation = useEscalationStore((state) => state.load);
  const pathname = usePathname();

  // Tier 1 results can arrive while the user is mid-pathway, so re-check on
  // every mount of the tab shell rather than once at sign-in.
  const userId = session?.user.id;
  useEffect(() => {
    if (userId) {
      void loadEscalation(userId);
    }
  }, [userId, loadEscalation]);

  // Only block the tab shell until the first consent fetch finishes.
  // Later refreshes must not trap users on a spinner when opening Follow-up.
  const waitingConsents =
    Boolean(session) &&
    onboardingCompleted &&
    !triageLoading &&
    triageStatus === "clear" &&
    !consentLoaded;

  if (authLoading || (session && onboardingCompleted && triageLoading) || waitingConsents) {
    return <GateLoading />;
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

  // A positive CTC pauses the whole preventative arm pending specialist
  // review, so it gates the tab shell exactly like a symptomatic triage.
  // A positive BRCA deliberately does not: that is a referral, shown as a
  // banner, and the clinician decides whether these steps continue.
  if (ctcPositive) {
    return <Redirect href={routes.escalation} />;
  }

  const onSymptomCheck = pathname.includes("symptom-check");
  const onQuestionnaire = pathname.includes("questionnaire");
  const onResults = pathname.includes("results");
  const onPlan = pathname.includes("/plan") || pathname.endsWith("plan");
  const onFollowup = pathname.includes("followup");
  const onStore = pathname.includes("/(store)") || pathname.includes("/store");
  const onOrders = pathname.includes("/(orders)") || pathname.includes("/orders");
  const onTermPreview = pathname.includes("clinical-term-preview");
  const onSettingsDeep =
    pathname.includes("(settings)") &&
    !pathname.endsWith("(settings)") &&
    !pathname.endsWith("/settings") &&
    pathname !== "/(main)/(settings)" &&
    !pathname.endsWith("/(settings)/");
  const questionnaireHub =
    pathname === "/questionnaire" || pathname.endsWith("/questionnaire");
  const onQuestionnaireSection = onQuestionnaire && !questionnaireHub;
  const consentScreen = consentScreenFromPath(pathname);
  const consentsDone = allConsentsAgreed(agreed);

  if (triageStatus === "pending" && !onSymptomCheck) {
    return <Redirect href={routes.symptomCheck} />;
  }

  if (triageStatus === "clear" && onSymptomCheck) {
    const next = firstIncompleteConsent(agreed);
    return (
      <Redirect href={next ? hrefForConsent(next) : routes.home} />
    );
  }

  // Questionnaire hub and results wait until BRCA, CTC, and SNP are all agreed.
  if (
    triageStatus === "clear" &&
    (onQuestionnaire || onResults || onPlan || onFollowup || onStore || onOrders) &&
    !consentsDone
  ) {
    const next = firstIncompleteConsent(agreed);
    return (
      <Redirect href={next ? hrefForConsent(next) : routes.consentBrca} />
    );
  }

  if (triageStatus === "clear" && consentScreen) {
    const bounce = redirectIfConsentOutOfOrder(consentScreen, agreed);
    if (bounce) {
      return <Redirect href={bounce} />;
    }
  }

  // Cosmetic bar visibility, and nothing else — every clinical gate is a
  // redirect above this line. What stays here is the set of full-screen
  // flows the boards draw without a bar: the symptom check, a consent, an
  // assessment section, plan, follow-up, orders, the term preview and the
  // settings sub-screens.
  //
  // Tests and Shop are deliberately absent. They are tab destinations now,
  // and suggested-tests.html, test-reports.html and wellness-shop.html each
  // draw the five-tab bar, so hiding it there would strand the user on two
  // of the bar's own five tabs.
  const hideTabBar =
    onSymptomCheck ||
    Boolean(consentScreen) ||
    onQuestionnaireSection ||
    onPlan ||
    onFollowup ||
    onOrders ||
    onTermPreview ||
    onSettingsDeep;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // The icons and labels colour themselves from `focused`, so these two
        // only matter to the ripple and to anything that falls back to tint.
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkFaint,
        // One function for both states: the bar's two label weights are the
        // whole of its active styling — there is no pill and no underline.
        tabBarLabel: ({ focused, children }) => (
          <Text style={[styles.label, focused ? styles.labelOn : styles.labelOff]}>
            {children}
          </Text>
        ),
        tabBarStyle: hideTabBar ? styles.barHidden : styles.bar,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="(results)"
        options={{
          title: "Tests",
          tabBarIcon: ({ focused }) => <TabIcon name="tests" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="(store)"
        options={{
          title: "Shop",
          tabBarIcon: ({ focused }) => <TabIcon name="shop" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="(buddies)"
        options={{
          title: "Buddies",
          tabBarIcon: ({ focused }) => (
            <TabIcon name="buddies" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="(settings)"
        options={{
          title: "More",
          tabBarIcon: ({ focused }) => <TabIcon name="more" focused={focused} />,
        }}
      />
      {/*
        Off the bar, still routable — and still gated. The assessment is one
        of these now: Home's next-step card is the way in, which is why
        `questionnaire` carries `href: null` rather than a sixth tab. Its
        gates are untouched.
      */}
      <Tabs.Screen
        name="questionnaire"
        options={{
          href: null,
          title: "Questionnaire",
        }}
      />
      <Tabs.Screen
        name="(triage)"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="(consent)"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="(plan)"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="(followup)"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="(orders)"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="(activity)"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="(goals)"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="(meal-plans)"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="(medications)"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="(recipes)"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="(reminders)"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="clinical-term-preview"
        options={{
          href: null,
          title: "Preview",
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  /**
   * White, flat, and nothing else: no backdrop, no top border, no shadow and
   * no elevation. The bar reads as chrome because the screen ground is paper
   * and the bar is white, the same way a card does.
   *
   * The `elevation` and `shadowOpacity` zeroes below are the one deliberate
   * exception to the sweep's "no shadow properties anywhere" rule: React
   * Navigation gives the tab bar a platform shadow of its own, and zeroing
   * both is the only way to take it away. They add nothing — they remove.
   */
  bar: {
    backgroundColor: colors.white,
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    // minHeight, not height: a fixed height would override the bottom safe
    // area the bar adds for itself and clip the labels on a notched phone.
    paddingTop: spacing.mdSm,
    minHeight: 64,
  },
  barHidden: {
    display: "none",
  },
  label: {
    fontSize: 10,
  },
  labelOn: {
    fontFamily: fontFamily.bodySemi,
    color: colors.ink,
  },
  labelOff: {
    fontFamily: fontFamily.bodyMedium,
    // inkMuted, not inkFaint: at 10px this is text, and inkFaint is 3.47:1
    // against AA's 4.5:1. The icons stay on inkFaint — as non-text UI they
    // only owe 3:1, and the boards draw them that way.
    color: colors.inkMuted,
  },
});
