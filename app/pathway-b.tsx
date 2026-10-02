import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler, StyleSheet, Text, View } from "react-native";

import { TextButton } from "@/components/ui/Button";
import { PathwayBBanner } from "@/components/ui/PathwayBBanner";
import { Screen } from "@/components/ui/Screen";
import { COPY } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/**
 * Pathway B — outside the main stack on purpose.
 * Symptomatic users stay here. Back is swallowed so they cannot
 * return to the symptom check or questionnaire.
 */
export default function PathwayBScreen() {
  const session = useAuthStore((state) => state.session);
  const termsPrivacyAccepted = useAuthStore((state) => state.termsPrivacyAccepted);
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

  if (!termsPrivacyAccepted) {
    return <Redirect href={routes.consentPrivacy} />;
  }

  if (!triageLoading && triageStatus !== "locked") {
    return (
      <Redirect
        href={triageStatus === "clear" ? routes.home : routes.symptomCheck}
      />
    );
  }

  return (
    <Screen scroll>
      <PathwayBBanner
        onFindDoctor={() => {
          setNotice(COPY.pathwayBFindDoctorHint);
        }}
        onSavePlace={() => {
          setNotice(COPY.pathwayBSaved);
        }}
      />
      {notice ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}
      <Text style={styles.locked}>{COPY.pathwayBLockedNote}</Text>
      <View style={styles.signOut}>
        <TextButton
          title={COPY.signOut}
          onPress={() => {
            void signOut();
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: {
    marginTop: Gap.cards,
    borderRadius: 16,
    backgroundColor: Colors.orangeTint,
    padding: Space.md + 2,
  },
  noticeText: {
    ...typeStyle("secondary"),
    color: Colors.orangeDeep,
  },
  locked: {
    ...typeStyle("secondary"),
    marginTop: Gap.sections,
    color: Colors.muted,
  },
  signOut: {
    marginTop: Space.md,
    alignItems: "flex-start",
  },
});
