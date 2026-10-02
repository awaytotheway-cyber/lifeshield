import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { PrimaryButton } from "@/components/ui/Button";
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
      title={COPY.welcomeTitle}
      body={COPY.welcomeBody}
      footer={
        <>
          <SetupBanners />
          <PrimaryButton
            title={COPY.welcomeContinue}
            onPress={() => router.push(routes.disclaimer)}
            style={styles.action}
          />
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  action: {
    marginTop: 0,
  },
});
