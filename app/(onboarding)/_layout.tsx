import { Redirect, Stack } from "expo-router";

import { GateLoading, PostAuthRedirect } from "@/components/journey/PostAuthRedirect";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";

export default function OnboardingLayout() {
  const loading = useAuthStore((state) => state.loading);
  const session = useAuthStore((state) => state.session);
  const onboardingCompleted = useAuthStore((state) => state.onboardingCompleted);

  if (loading) {
    return <GateLoading />;
  }

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (onboardingCompleted) {
    return <PostAuthRedirect />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
