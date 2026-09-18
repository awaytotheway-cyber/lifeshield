import { Redirect, useRouter } from "expo-router";
import { Linking, StyleSheet, Text, View } from "react-native";

import { TextButton } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { COPY } from "@/lib/copy";
import { colors, spacing } from "@/lib/design-tokens";
import { PROFILE_FAQ } from "@/lib/profile-constants";
import { routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
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
        <GlassCard key={item.id} intensity="card" style={styles.card}>
          <Text style={styles.q}>{item.question}</Text>
          <Text style={styles.a}>{item.answer}</Text>
        </GlassCard>
      ))}

      <GlassCard intensity="card" style={styles.card}>
        <Text style={styles.q}>{COPY.helpTutorials}</Text>
        <Text style={styles.a}>{COPY.helpTutorialsBody}</Text>
      </GlassCard>

      <GlassCard intensity="card" style={styles.card}>
        <Text style={styles.q}>{COPY.helpContact}</Text>
        <Text style={styles.a}>{COPY.helpContactBody}</Text>
        <TextButton
          title="Email support@prescope.app"
          onPress={() => {
            void Linking.openURL("mailto:support@prescope.app");
          }}
        />
      </GlassCard>

      <GlassCard intensity="card" style={styles.card}>
        <Text style={styles.q}>{COPY.helpFeedback}</Text>
        <Text style={styles.a}>{COPY.helpFeedbackBody}</Text>
        <View>
          <TextButton
            title="Email feedback@prescope.app"
            onPress={() => {
              void Linking.openURL("mailto:feedback@prescope.app");
            }}
          />
        </View>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    marginBottom: spacing.sm,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
  },
  card: {
    marginTop: spacing.mdSm,
    padding: spacing.base,
  },
  q: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 17,
    color: colors.charcoal,
  },
  a: {
    marginTop: 8,
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.slate,
  },
});
