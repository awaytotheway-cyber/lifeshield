import { Redirect, useRouter } from "expo-router";
import { Text } from "react-native";

import { GateLoading } from "@/components/journey/PostAuthRedirect";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { COPY } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useEligibilityStore } from "@/stores/eligibility-store";

/**
 * The exit for someone under the age floor. It is a plain explanation, not
 * Pathway B: nothing here says they have a symptom. Settings stays reachable
 * so they can still sign out or delete their account.
 */
export default function NotEligibleScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const loaded = useEligibilityStore((state) => state.loaded);
  const status = useEligibilityStore((state) => state.status);

  if (!session) {
    return <Redirect href={routes.login} />;
  }
  if (!loaded) {
    return <GateLoading />;
  }
  // Only an under-age patient belongs here; anyone else goes back to Home,
  // which sends them to the right next step.
  if (status !== "under_age") {
    return <Redirect href={routes.home} />;
  }

  return (
    <Screen scroll>
      <Text className="text-worthDiscussing text-3xl">{COPY.appName}</Text>
      <Text className="mt-4 text-2xl text-ink">{COPY.notEligibleTitle}</Text>
      <Text className="mt-3 text-ink">{COPY.notEligibleBody}</Text>
      <Button
        title={COPY.notEligibleSettings}
        variant="secondary"
        onPress={() => router.replace(routes.settings)}
      />
    </Screen>
  );
}
