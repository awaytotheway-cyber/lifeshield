import { useRouter } from "expo-router";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { PrimaryButton } from "@/components/ui/Button";
import { SetupBanners } from "@/components/ui/SetupBanners";
import type { TwoTonePart } from "@/components/ui/TwoTone";
import { resolveCopy } from "@/lib/app-content";
import { useAppContent } from "@/lib/content-context";
import { COPY } from "@/lib/copy";
import { routes } from "@/lib/routes";

/**
 * The two-tone split of the default headline: read only the bold words and
 * "Understand … picture" still stands as a sentence.
 */
const TITLE_PARTS: TwoTonePart[] = [
  { text: "Understand", tone: "bold" },
  { text: " your lifestyle", tone: "grey" },
  { text: " picture", tone: "bold" },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const content = useAppContent();
  const copy = (key: string, fallback: string) =>
    resolveCopy(content, key, fallback);

  const title = copy("welcomeTitle", COPY.welcomeTitle);

  return (
    <OnboardingShell
      step={1}
      showTrustBanner
      title={title}
      // A remote override is arbitrary copy, so it cannot be split by hand —
      // it falls back to the single-tone headline.
      titleParts={title === COPY.welcomeTitle ? TITLE_PARTS : undefined}
      body={copy("welcomeBody", COPY.welcomeBody)}
      footer={
        <>
          <SetupBanners />
          {/* The single ink button on this screen. */}
          <PrimaryButton
            title={copy("welcomeContinue", COPY.welcomeContinue)}
            onPress={() => router.push(routes.disclaimer)}
          />
        </>
      }
    />
  );
}
