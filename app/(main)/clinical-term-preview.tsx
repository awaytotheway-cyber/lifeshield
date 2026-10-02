import { Redirect, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { ClinicalTerm } from "@/components/ClinicalTerm";
import { PrimaryButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { COPY } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { Colors, Gap, typeStyle } from "@/lib/theme";
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
        onBack={() => router.replace(routes.home)}
        backLabel={COPY.clinicalTermPreviewBack}
      />

      <Card>
        <Text style={styles.body}>{COPY.clinicalTermPreviewBody}</Text>
      </Card>

      {/* Sample: Gut health check (TERMS.stool) */}
      <ClinicalTerm termKey="stool" />

      <View style={styles.footer}>
        <PrimaryButton
          title={COPY.clinicalTermPreviewBack}
          onPress={() => {
            router.replace(routes.home);
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    ...typeStyle("body"),
    color: Colors.body,
  },
  footer: {
    marginTop: Gap.beforeFooter,
  },
});
