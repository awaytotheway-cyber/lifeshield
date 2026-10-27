import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { Redirect, useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { TextButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Surface } from "@/components/ui/Surface";
import { COPY } from "@/lib/copy";
import { colors, spacing } from "@/lib/design-tokens";
import { legalPageUrl } from "@/lib/legal";
import { routes } from "@/lib/routes";
import { typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

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
    <Screen scroll contentPadding={spacing.screenX}>
      <ScreenHeader
        title={COPY.aboutTitle}
        onBack={() => router.replace(routes.settings)}
      />
      <Text style={styles.body}>{COPY.aboutBody}</Text>

      <Surface style={styles.card}>
        <Text style={styles.label}>{COPY.aboutVersion}</Text>
        <Text style={styles.value}>{version}</Text>
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
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Load-bearing: "does not diagnose, detect, or treat". Stays in full.
  body: {
    marginTop: spacing.sm,
    ...typography.body,
    color: colors.inkSoft,
  },
  card: {
    marginTop: spacing.md,
    padding: spacing.base,
  },
  // 11px micro caps, in inkMuted — inkFaint is for headline words only.
  label: {
    ...typography.micro,
    color: colors.inkMuted,
  },
  gap: {
    marginTop: 16,
  },
  value: {
    marginTop: spacing.micro,
    ...typography.body,
    color: colors.ink,
  },
});
