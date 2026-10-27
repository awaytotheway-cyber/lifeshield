import { Redirect } from "expo-router";
import { useEffect } from "react";
import { BackHandler, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { TextButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Surface } from "@/components/ui/Surface";
import { COPY } from "@/lib/copy";
import { colors, radius, spacing } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useEscalationStore } from "@/stores/escalation-store";

/**
 * Tier 1 hard stop — a positive circulating tumour cell result.
 *
 * Lives outside the main tabs for the same reason Pathway B does: the
 * preventative arm pauses pending specialist review, so the questionnaire
 * and downstream steps must not be reachable from here. Back is swallowed.
 *
 * A positive BRCA result does NOT land here — that is a referral, surfaced
 * as a banner, and the pathway stays open.
 */
export default function EscalationScreen() {
  const session = useAuthStore((state) => state.session);
  const termsPrivacyAccepted = useAuthStore(
    (state) => state.termsPrivacyAccepted,
  );
  const signOut = useAuthStore((state) => state.signOut);
  const escalation = useEscalationStore((state) => state.state);
  const loading = useEscalationStore((state) => state.loading);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (!termsPrivacyAccepted) {
    return <Redirect href={routes.consentPrivacy} />;
  }

  // Result withdrawn or corrected by a clinician — let them back in.
  if (!loading && !escalation.ctcPositive) {
    return <Redirect href={routes.home} />;
  }

  return (
    <Screen scroll contentPadding={spacing.screenX}>
      <Surface style={styles.card}>
        <View style={styles.iconWell}>
          <Feather name="user-plus" size={28} color={colors.mossDeep} />
        </View>
        <Text style={styles.title}>{COPY.ctcStopTitle}</Text>
        <Text style={styles.body}>{COPY.ctcStopBody}</Text>
        <Text style={styles.reassure}>{COPY.ctcStopNotADiagnosis}</Text>
      </Surface>

      <Text style={styles.paused}>{COPY.ctcStopPausedNote}</Text>

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
  card: {
    padding: spacing.md,
    alignItems: "center",
  },
  // A tinted disc, not an outlined one: a white ring on a white card was a
  // border doing nothing, and Moss puts no border on a surface.
  iconWell: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mossTint,
    marginBottom: spacing.base,
  },
  title: {
    ...typography.title,
    color: colors.ink,
    textAlign: "center",
  },
  body: {
    marginTop: spacing.mdSm,
    ...typography.body,
    color: colors.inkSoft,
    textAlign: "center",
  },
  // The "not a diagnosis" framing. Load-bearing, so it keeps its own tinted
  // panel rather than being folded into the body copy.
  reassure: {
    marginTop: spacing.base,
    padding: spacing.mdSm,
    borderRadius: radius.surface,
    backgroundColor: colors.mossTint,
    ...typography.label,
    color: colors.ink,
    textAlign: "center",
  },
  paused: {
    marginTop: spacing.base,
    ...typography.label,
    color: colors.inkSoft,
  },
});
