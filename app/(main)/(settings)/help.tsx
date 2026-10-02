import { Redirect, useRouter } from "expo-router";
import { Linking, StyleSheet, Text, View } from "react-native";

import { SecondaryButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { COPY } from "@/lib/copy";
import { PROFILE_FAQ } from "@/lib/profile-constants";
import { routes } from "@/lib/routes";
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
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
    <Screen scroll>
      <ScreenHeader
        title={COPY.helpTitle}
        subtitle={COPY.helpBody}
        onBack={() => router.replace(routes.settings)}
        backLabel={COPY.settingsTitle}
      />

      <SectionTitle title="Common questions" first />
      <View style={styles.list}>
        {PROFILE_FAQ.map((item) => (
          <Card key={item.id}>
            <Text style={styles.q}>{item.question}</Text>
            <Text style={styles.a}>{item.answer}</Text>
          </Card>
        ))}
        <Card>
          <Text style={styles.q}>{COPY.helpTutorials}</Text>
          <Text style={styles.a}>{COPY.helpTutorialsBody}</Text>
        </Card>
      </View>

      <SectionTitle title="Talk to us" />
      <View style={styles.list}>
        <Card>
          <Text style={styles.q}>{COPY.helpContact}</Text>
          <Text style={styles.a}>{COPY.helpContactBody}</Text>
          <SecondaryButton
            title="Email support@prescope.app"
            icon="mail"
            onPress={() => {
              void Linking.openURL("mailto:support@prescope.app");
            }}
          />
        </Card>

        <Card>
          <Text style={styles.q}>{COPY.helpFeedback}</Text>
          <Text style={styles.a}>{COPY.helpFeedbackBody}</Text>
          <SecondaryButton
            title="Email feedback@prescope.app"
            icon="message-circle"
            onPress={() => {
              void Linking.openURL("mailto:feedback@prescope.app");
            }}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Gap.cards,
  },
  q: {
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  a: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
  },
});
