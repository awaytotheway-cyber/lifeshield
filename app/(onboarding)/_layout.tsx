import { Redirect, Stack, usePathname } from "expo-router";

import { GateLoading, PostAuthRedirect } from "@/components/journey/PostAuthRedirect";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";

export default function OnboardingLayout() {
  const loading = useAuthStore((state) => state.loading);
  const session = useAuthStore((state) => state.session);
  const termsPrivacyAccepted = useAuthStore((state) => state.termsPrivacyAccepted);
  const onboardingCompleted = useAuthStore((state) => state.onboardingCompleted);
  const pathname = usePathname();

  if (loading) {
    return <GateLoading />;
  }

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  const onConsentGate = pathname.includes("consent-privacy");

  if (!termsPrivacyAccepted) {
    if (!onConsentGate) {
      return <Redirect href={routes.consentPrivacy} />;
    }
    return (
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          animation: "none",
        }}
      />
    );
  }

  if (onboardingCompleted) {
    return <PostAuthRedirect />;
  }

  if (onConsentGate) {
    return <Redirect href={routes.welcome} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
