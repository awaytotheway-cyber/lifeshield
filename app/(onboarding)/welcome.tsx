import { useRouter } from "expo-router";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { PrimaryButton } from "@/components/ui/Button";
import { SetupBanners } from "@/components/ui/SetupBanners";
import { resolveCopy } from "@/lib/app-content";
import { useAppContent } from "@/lib/content-context";
import { COPY } from "@/lib/copy";
import { routes } from "@/lib/routes";

export default function WelcomeScreen() {
  const router = useRouter();
  const content = useAppContent();
  const copy = (key: string, fallback: string) =>
    resolveCopy(content, key, fallback);

  return (
    <OnboardingShell
      step={1}
      icon="sun"
      showTrustBanner
      title={copy("welcomeTitle", COPY.welcomeTitle)}
      body={copy("welcomeBody", COPY.welcomeBody)}
      footer={
        <>
          <SetupBanners />
          <PrimaryButton
            title={copy("welcomeContinue", COPY.welcomeContinue)}
            onPress={() => router.push(routes.disclaimer)}
          />
        </>
      }
    />
  );
}
