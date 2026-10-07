import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { Redirect, useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { TextButton } from "@/components/ui/Button";
import { Sheet } from "@/components/specimen/Sheet";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { COPY } from "@/lib/copy";
import { legalPageUrl } from "@/lib/legal";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";
import { Accent, Ink, Measure, SpecimenType } from "@/lib/specimen-tokens";

export default function AboutSettingsScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const version =
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    "1.0.0";

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
    <Screen scroll contentPadding={Measure.gutter}>
      <ScreenHeader
        title={COPY.aboutTitle}
        onBack={() => router.replace(routes.settings)}
      />
      <Text style={styles.brand} accessibilityRole="header">
        PRESCOPE
      </Text>
      <Text style={styles.body}>{COPY.aboutBody}</Text>

      <Sheet style={styles.card}>
        <Text style={styles.label}>{COPY.aboutVersion}</Text>
        <Text style={styles.value}>{version}</Text>
        <Text style={[styles.label, styles.gap]}>{COPY.aboutCompany}</Text>
        <Text style={styles.value}>{COPY.aboutCompany}</Text>
        <Text style={[styles.label, styles.gap]}>{COPY.aboutWhatsNew}</Text>
        <Text style={styles.value}>{COPY.aboutWhatsNewBody}</Text>
        <Text style={[styles.label, styles.gap]}>{COPY.aboutOss}</Text>
        <Text style={styles.value}>{COPY.aboutOssBody}</Text>
        <TextButton
          title={COPY.privacyPolicyLink}
          onPress={() => {
            void WebBrowser.openBrowserAsync(legalPageUrl("privacy"));
          }}
        />
        <TextButton
          title={COPY.privacyTermsLink}
          onPress={() => {
            void WebBrowser.openBrowserAsync(legalPageUrl("terms"));
          }}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    fontFamily: SpecimenType.serif,
    fontSize: 40,
    letterSpacing: -0.8,
    color: Accent.tag,
  },
  body: {
    marginTop: 8,
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    lineHeight: 26,
    color: Ink.soft,
  },
  card: {
    marginTop: Measure.loose,
    padding: Measure.base,
  },
  label: {
    fontFamily: SpecimenType.mono,
    fontSize: 14,
    color: Ink.soft,
  },
  gap: {
    marginTop: 16,
  },
  value: {
    marginTop: 4,
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    lineHeight: 24,
    color: Ink.full,
  },
});
