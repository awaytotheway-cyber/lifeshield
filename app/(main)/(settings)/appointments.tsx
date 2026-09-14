import { Redirect, useRouter } from "expo-router";

import { FollowUpCalendar } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { COPY } from "@/lib/copy";
import { spacing } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/** Honest shell — no appointments table/API in this build. */
export default function AppointmentsScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);

  if (!session) {
    return <Redirect href={routes.login} />;
  }
  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }
  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  return (
    <Screen contentPadding={spacing.screenX}>
      <ScreenHeader
        title={COPY.appointmentsTitle}
        onBack={() => router.back()}
      />
      <EmptyState
        heading={COPY.appointmentsEmptyHeading}
        explanation={COPY.appointmentsEmptyBody}
        illustration={<FollowUpCalendar width={200} />}
      />
    </Screen>
  );
}
