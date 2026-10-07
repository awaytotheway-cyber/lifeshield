import { Redirect, useRouter } from "expo-router";
import { Linking, StyleSheet, Text, View } from "react-native";

import { TextButton } from "@/components/ui/Button";
import { Sheet } from "@/components/specimen/Sheet";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { COPY } from "@/lib/copy";
import { PROFILE_FAQ } from "@/lib/profile-constants";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";
import { Ink, Measure, SpecimenType } from "@/lib/specimen-tokens";

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
    <Screen scroll contentPadding={Measure.gutter}>
      <ScreenHeader
        title={COPY.helpTitle}
        onBack={() => router.replace(routes.settings)}
      />
      <Text style={styles.body}>{COPY.helpBody}</Text>

      {PROFILE_FAQ.map((item) => (
        <Sheet key={item.id}  style={styles.card}>
          <Text style={styles.q}>{item.question}</Text>
          <Text style={styles.a}>{item.answer}</Text>
        </Sheet>
      ))}

      <Sheet style={styles.card}>
        <Text style={styles.q}>{COPY.helpTutorials}</Text>
        <Text style={styles.a}>{COPY.helpTutorialsBody}</Text>
      </Sheet>

      <Sheet style={styles.card}>
        <Text style={styles.q}>{COPY.helpContact}</Text>
        <Text style={styles.a}>{COPY.helpContactBody}</Text>
        <TextButton
          title="Email support@prescope.app"
          onPress={() => {
            void Linking.openURL("mailto:support@prescope.app");
          }}
        />
      </Sheet>

      <Sheet style={styles.card}>
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
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    marginBottom: Measure.tight,
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    lineHeight: 26,
    color: Ink.soft,
  },
  card: {
    marginTop: Measure.snug,
    padding: Measure.base,
  },
  q: {
    fontFamily: SpecimenType.serif,
    fontSize: 19,
    color: Ink.full,
  },
  a: {
    marginTop: 8,
    fontFamily: SpecimenType.mono,
    fontSize: 16,
    lineHeight: 24,
    color: Ink.soft,
  },
});
