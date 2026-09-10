import { useRouter } from "expo-router";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { PrimaryButton } from "@/components/ui/Button";
import { COPY } from "@/lib/copy";
import { routes } from "@/lib/routes";

export default function DisclaimerScreen() {
  const router = useRouter();

  return (
    <OnboardingShell
      step={2}
      icon="info"
      title={COPY.disclaimerTitle}
      body={COPY.disclaimerBody}
      onSkip={() => router.push(routes.terms)}
      footer={
        <PrimaryButton
          title={COPY.disclaimerButton}
          onPress={() => router.push(routes.terms)}
        />
      }
    />
  );
}
