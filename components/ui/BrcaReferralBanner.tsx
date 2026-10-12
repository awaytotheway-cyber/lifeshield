import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { COPY } from "@/lib/copy";
import { colors, radius, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";
import { useEscalationStore } from "@/stores/escalation-store";

/**
 * Shown when BRCA1/2 came back positive. Deliberately a banner rather than
 * a blocking screen: the protocol calls for genetic counselling and a
 * specialist referral running "in parallel with / instead of" the
 * risk-modification arm, which is the clinician's call, not the app's.
 *
 * Renders nothing when there is no BRCA positive, or when a CTC positive
 * has already taken over the whole screen with a hard stop.
 */
export function BrcaReferralBanner() {
  const escalation = useEscalationStore((state) => state.state);

  if (!escalation.brcaPositive || escalation.ctcPositive) {
    return null;
  }

  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={styles.iconWrap}>
        <Feather name="users" size={18} color={colors.white} />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title}>{COPY.brcaReferralTitle}</Text>
        <Text style={styles.body}>{COPY.brcaReferralBody}</Text>
        <Text style={styles.note}>{COPY.brcaReferralNote}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.mdSm,
    padding: spacing.base,
    borderRadius: radius.alert,
    backgroundColor: colors.amberLight,
    borderWidth: 1,
    borderColor: colors.amber,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.amber,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 15,
    lineHeight: 20,
    color: colors.deepNavy,
  },
  body: {
    marginTop: 4,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.slate,
  },
  note: {
    marginTop: 6,
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    lineHeight: 17,
    color: colors.deepNavy,
  },
});
