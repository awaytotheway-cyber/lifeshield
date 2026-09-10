import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler, StyleSheet, Text } from "react-native";

import { PathwayBBanner } from "@/components/ui/PathwayBBanner";
import { Screen } from "@/components/ui/Screen";
import { TextButton } from "@/components/ui/Button";
import { COPY } from "@/lib/copy";
import { colors, spacing } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/**
 * Pathway B — outside the main tabs on purpose.
 * Symptomatic users stay here. Back is swallowed so they cannot
 * return to the symptom check or questionnaire.
 */
export default function PathwayBScreen() {
  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);
  const triageStatus = useTriageStore((state) => state.status);
  const triageLoading = useTriageStore((state) => state.loading);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      // Block Android back. iOS swipe-back is disabled on this stack screen.
      return true;
    });
    return () => sub.remove();
  }, []);

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (!triageLoading && triageStatus !== "locked") {
    return (
      <Redirect
        href={triageStatus === "clear" ? routes.home : routes.symptomCheck}
      />
    );
  }

  return (
    <Screen scroll contentPadding={spacing.screenX}>
      <PathwayBBanner
        onFindDoctor={() => {
          setNotice(COPY.pathwayBFindDoctorHint);
        }}
        onSavePlace={() => {
          setNotice(COPY.pathwayBSaved);
        }}
      />
      <Text style={styles.locked}>{COPY.pathwayBLockedNote}</Text>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <TextButton
        title={COPY.signOut}
        onPress={() => {
          void signOut();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  locked: {
    marginTop: 16,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.slate,
  },
  notice: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.charcoal,
  },
});
