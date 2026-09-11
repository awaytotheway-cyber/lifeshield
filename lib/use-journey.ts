/**
 * Where a signed-in person should land after splash / login.
 * Locked users never go to Home.
 */
import type { Href } from "expo-router";

import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

export function useJourney(): { loading: boolean; href: Href } {
  const authLoading = useAuthStore((state) => state.loading);
  const session = useAuthStore((state) => state.session);
  const onboardingCompleted = useAuthStore((state) => state.onboardingCompleted);
  const triageLoading = useTriageStore((state) => state.loading);
  const triageStatus = useTriageStore((state) => state.status);

  if (authLoading) {
    return { loading: true, href: routes.splash };
  }
  if (!session) {
    return { loading: false, href: routes.login };
  }
  if (!onboardingCompleted) {
    return { loading: false, href: routes.welcome };
  }
  if (triageLoading) {
    return { loading: true, href: routes.splash };
  }
  if (triageStatus === "locked") {
    return { loading: false, href: routes.pathwayB };
  }
  if (triageStatus === "pending") {
    return { loading: false, href: routes.symptomCheck };
  }
  return { loading: false, href: routes.home };
}
