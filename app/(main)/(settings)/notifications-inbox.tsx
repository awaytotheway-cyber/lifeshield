import { Redirect, useRouter } from "expo-router";

import { EmptyHourglass } from "@/components/illustrations";
import { TextButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { COPY } from "@/lib/copy";
import { spacing } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/**
 * Notification inbox shell. Follow-up reminders live on Follow-up;
 * there is no separate server inbox table yet.
 */
export default function NotificationsInboxScreen() {
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
        title={COPY.notifInboxTitle}
        onBack={() => router.back()}
      />
      <EmptyState
        heading={COPY.notifInboxEmptyHeading}
        explanation={COPY.notifInboxEmptyBody}
        illustration={<EmptyHourglass width={160} />}
      />
      <TextButton
        title={COPY.settingsOpenNotifications}
        onPress={() => router.push(routes.settingsNotifications)}
      />
      <TextButton
        title={COPY.homeStepFollowUp}
        onPress={() => router.push(routes.followUp)}
      />
    </Screen>
  );
}
