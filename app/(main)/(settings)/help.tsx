import { Redirect, useRouter } from "expo-router";
import { Linking, StyleSheet, Text } from "react-native";

import { TextButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Surface } from "@/components/ui/Surface";
import { COPY } from "@/lib/copy";
import { colors, spacing } from "@/lib/design-tokens";
import { PROFILE_FAQ } from "@/lib/profile-constants";
import { routes } from "@/lib/routes";
import { typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

export default function HelpSettingsScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);

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
        title={COPY.helpTitle}
        onBack={() => router.replace(routes.settings)}
      />
      <Text style={styles.body}>{COPY.helpBody}</Text>

      {PROFILE_FAQ.map((item) => (
        <Surface key={item.id} style={styles.card}>
          <Text style={styles.q}>{item.question}</Text>
          <Text style={styles.a}>{item.answer}</Text>
        </Surface>
      ))}

      <Surface style={styles.card}>
        <Text style={styles.q}>{COPY.helpTutorials}</Text>
        <Text style={styles.a}>{COPY.helpTutorialsBody}</Text>
      </Surface>

      <Surface style={styles.card}>
        <Text style={styles.q}>{COPY.helpContact}</Text>
        <Text style={styles.a}>{COPY.helpContactBody}</Text>
        <TextButton
          title="Email support@prescope.app"
          onPress={() => {
            void Linking.openURL("mailto:support@prescope.app");
          }}
        />
      </Surface>

      <Surface style={styles.card}>
        <Text style={styles.q}>{COPY.helpFeedback}</Text>
        <Text style={styles.a}>{COPY.helpFeedbackBody}</Text>
        <TextButton
          title="Email feedback@prescope.app"
          onPress={() => {
            void Linking.openURL("mailto:feedback@prescope.app");
          }}
        />
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    marginBottom: spacing.sm,
    ...typography.body,
    color: colors.inkSoft,
  },
  card: {
    marginTop: spacing.mdSm,
    padding: spacing.base,
  },
  q: {
    ...typography.title,
    color: colors.ink,
  },
  a: {
    marginTop: spacing.sm,
    ...typography.body,
    color: colors.inkSoft,
  },
});
