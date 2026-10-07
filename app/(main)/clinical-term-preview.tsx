import { Redirect, useRouter } from "expo-router";
import { Text } from "react-native";

import { ClinicalTerm } from "@/components/ClinicalTerm";
import { BackBar } from "@/components/ui/BackBar";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
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
      <BackBar onPress={() => router.back()} label="Back" />
      <Text className="text-center text-2xl text-inkFull">
        {COPY.clinicalTermPreviewTitle}
      </Text>
      <Text className="mt-3 text-center text-inkFull">
        {COPY.clinicalTermPreviewBody}
      </Text>

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
