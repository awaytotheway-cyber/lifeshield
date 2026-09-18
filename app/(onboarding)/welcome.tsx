import { useRouter } from "expo-router";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { PrimaryButton } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/LogoMark";
import { SetupBanners } from "@/components/ui/SetupBanners";
import { COPY } from "@/lib/copy";
import { routes } from "@/lib/routes";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <OnboardingShell
      step={1}
      icon="sun"
      showTrustBanner
      illustration={<LogoMark size={140} />}
      title={COPY.welcomeTitle}
      body={COPY.welcomeBody}
      footer={
        <>
          <SetupBanners />
          <PrimaryButton
            title={COPY.welcomeContinue}
            onPress={() => router.push(routes.disclaimer)}
          />
        </>
      }
    />
  );
}
