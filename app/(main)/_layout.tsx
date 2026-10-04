import { Redirect, Tabs, usePathname } from "expo-router";
import { StyleSheet, View } from "react-native";

import { GateLoading } from "@/components/journey/PostAuthRedirect";
import { AppDrawer } from "@/components/navigation/AppDrawer";
import { BottomNav } from "@/components/navigation/BottomNav";
import { DrawerProvider } from "@/components/navigation/DrawerContext";
import {
  allConsentsAgreed,
  firstIncompleteConsent,
  hrefForConsent,
  redirectIfConsentOutOfOrder,
  type SequentialConsent,
} from "@/lib/consent-flow";
import { routes } from "@/lib/routes";
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

  // Results and Plan are primary tabs in v2, so the bar stays visible
  // there. Only genuinely focused task flows hide it.
  const hideTabBar =
    onSymptomCheck ||
    Boolean(consentScreen) ||
    onQuestionnaireSection ||
    onTermPreview ||
    onSettingsDeep;

  // Referenced by the gating logic above; kept explicit so the intent of
  // each route check stays readable.
  void onResults;
  void onPlan;
  void onFollowup;
  void onStore;
  void onOrders;

  return (
    <DrawerProvider>
      <View style={styles.shell}>
        <Tabs
          // v2 custom tab bar: orange pill ABOVE the active icon.
          tabBar={() => (hideTabBar ? null : <BottomNav />)}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tabs.Screen name="home" options={{ title: "Home" }} />
          <Tabs.Screen name="questionnaire" options={{ title: "Questionnaire" }} />
          <Tabs.Screen name="(settings)" options={{ title: "More" }} />
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
          {/* Feature groups added after the original tab set. Declared
              with href: null so expo-router does not auto-add them. */}
          <Tabs.Screen name="specimen-home" options={{ href: null }} />
          <Tabs.Screen name="(goals)" options={{ href: null }} />
          <Tabs.Screen name="(buddies)" options={{ href: null }} />
          <Tabs.Screen name="(recipes)" options={{ href: null }} />
          <Tabs.Screen name="(partners)" options={{ href: null }} />
          <Tabs.Screen name="(journey)" options={{ href: null }} />
          <Tabs.Screen name="(plugins)" options={{ href: null }} />
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
