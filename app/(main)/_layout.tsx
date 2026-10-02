import { Redirect, Stack, usePathname } from "expo-router";
import { StyleSheet, View } from "react-native";

import { GateLoading } from "@/components/journey/PostAuthRedirect";
import { DrawerProvider } from "@/components/navigation/DrawerContext";
import { MenuDrawer } from "@/components/navigation/MenuDrawer";
import {
  allConsentsAgreed,
  firstIncompleteConsent,
  hrefForConsent,
  redirectIfConsentOutOfOrder,
  type SequentialConsent,
} from "@/lib/consent-flow";
import { routes } from "@/lib/routes";
import { Colors, Motion } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";
import { useConsentStore } from "@/stores/consent-store";
import { useTriageStore } from "@/stores/triage-store";

/**
 * Home sits underneath every other screen in this stack, so a deep link or a
 * refresh still has somewhere to go back to.
 */
export const unstable_settings = {
  initialRouteName: "home",
};

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
 * The signed-in shell. Home is the root of a Stack — there is NO bottom tab
 * bar anymore (Section 7). Everything else is reached from Home's content cards
 * or from the menu drawer, and pushes onto this stack.
 *
 * The journey safety gates below are unchanged: auth → terms → onboarding →
 * triage (pending / locked) → sequential consents. Do not reorder them.
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

  // Only block the shell until the first consent fetch finishes.
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

  return (
    <DrawerProvider>
      <View style={styles.shell}>
        <Stack
          screenOptions={{
            headerShown: false,
            // Section 9 motion: slide, ~300ms, ease-out.
            animation: "slide_from_right",
            animationDuration: Motion.screen,
            contentStyle: { backgroundColor: Colors.background },
          }}
        >
          {/* Home is the hub — the root of the stack. */}
          <Stack.Screen name="home" />
          <Stack.Screen name="questionnaire" />
          <Stack.Screen name="(settings)" />
          <Stack.Screen
            name="(triage)"
            options={{ gestureEnabled: false, animation: "none" }}
          />
          <Stack.Screen name="(consent)" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(results)" />
          <Stack.Screen name="(plan)" />
          <Stack.Screen name="(followup)" />
          <Stack.Screen name="(store)" />
          <Stack.Screen name="(orders)" />
          <Stack.Screen name="(goals)" />
          <Stack.Screen name="(buddies)" />
          <Stack.Screen name="(recipes)" />
          <Stack.Screen name="(partners)" />
          <Stack.Screen name="(journey)" />
          <Stack.Screen name="(plugins)" />
          <Stack.Screen name="clinical-term-preview" />
        </Stack>
        <MenuDrawer unreadCount={0} />
      </View>
    </DrawerProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
});
