import { Redirect, useRouter } from "expo-router";

import { ClinicalTerm } from "@/components/ClinicalTerm";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { BodyText } from "@/components/ui/Typography";
import { COPY } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Phase 2 Day 1 sample only.
 * One term so the founder can approve the plain / accurate pattern
 * before we wire lab results or a results dashboard.
 */
export default function ClinicalTermPreviewScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  return (
    <Screen scroll>
      <ScreenHeader
        title={COPY.clinicalTermPreviewTitle}
        onBack={() => router.back()}
      />
      <BodyText className="mt-3" centered>
        {COPY.clinicalTermPreviewBody}
      </BodyText>

      {/* Sample: Gut health check (TERMS.stool) */}
      <ClinicalTerm termKey="stool" />

      <Button
        title={COPY.clinicalTermPreviewBack}
        onPress={() => {
          router.replace(routes.home);
        }}
      />
    </Screen>
  );
}
