import { Redirect, Tabs, usePathname } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { GateLoading } from "@/components/journey/PostAuthRedirect";
import { AppDrawer } from "@/components/navigation/AppDrawer";
import { DrawerProvider } from "@/components/navigation/DrawerContext";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  allConsentsAgreed,
  firstIncompleteConsent,
  hrefForConsent,
  redirectIfConsentOutOfOrder,
  type SequentialConsent,
} from "@/lib/consent-flow";
import { colors } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useConsentStore } from "@/stores/consent-store";
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
 * Home / Questionnaire / More. Symptom check and consents live here too
 * but are hidden from the tab bar. Locked users never see these tabs.
 * Side drawer overlays the tabs without replacing journey safety gates.
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
  const pathname = usePathname();

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

  const hideTabBar =
    onSymptomCheck ||
    Boolean(consentScreen) ||
    onQuestionnaireSection ||
    onResults ||
    onPlan ||
    onFollowup ||
    onStore ||
    onOrders ||
    onTermPreview ||
    onSettingsDeep;

  return (
    <DrawerProvider>
      <View style={styles.shell}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.primaryBlue,
            tabBarInactiveTintColor: colors.slate,
            tabBarLabelStyle: {
              fontFamily: fontFamily.body,
              fontSize: 13,
            },
            tabBarBackground: () =>
              hideTabBar ? null : (
                <GlassCard intensity="chrome" style={StyleSheet.absoluteFill} />
              ),
            tabBarStyle: hideTabBar
              ? { display: "none" }
              : {
                  // A real backgroundColor under the GlassCard blur layer —
                  // native BlurView tinting isn't reliable on web, so this
                  // guarantees contrast for the inactive tab icons/labels
                  // even where the blur renders as a plain light box.
                  backgroundColor: "rgba(255,255,255,0.92)",
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.glassBorder,
                  elevation: 0,
                  minHeight: 52,
                },
          }}
        >
          <Tabs.Screen
            name="home"
            options={{
              title: "Home",
              tabBarIcon: ({ color }) => (
                <Feather name="home" size={24} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="questionnaire"
            options={{
              title: "Questionnaire",
              tabBarIcon: ({ color }) => (
                <Feather name="clipboard" size={24} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="(settings)"
            options={{
              title: "More",
              tabBarIcon: ({ color }) => (
                <Feather name="menu" size={24} color={color} />
              ),
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
            name="(results)"
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
            name="(store)"
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
            name="clinical-term-preview"
            options={{
              href: null,
              title: "Preview",
            }}
          />
        </Tabs>
        <AppDrawer unreadCount={0} />
      </View>
    </DrawerProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
});
