import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors, radius, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type TrustBannerProps = {
  title?: string;
  body?: string;
};

/**
 * Trust / privacy strip — sits near the top of home and onboarding.
 *
 * `mossTint` rather than an inverted slab: the copy here is reassurance, not
 * a warning, so it reads as one of the quietest things on the screen. The
 * wording is load-bearing (RLS, "not a diagnosis") and stays in full.
 */
export function TrustBanner({
  title = "Your data stays private",
  body = "Answers travel over HTTPS and stay private to your account (Row Level Security). Assigned clinicians only see what you share for review. PRESCOPE is a lifestyle awareness tool — not a diagnosis.",
}: TrustBannerProps) {
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={styles.iconWrap}>
        <Feather name="shield" size={18} color={colors.white} />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
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
    borderRadius: radius.surface,
    backgroundColor: colors.mossTint,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.mossDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 15,
    lineHeight: 20,
    color: colors.ink,
  },
  body: {
    marginTop: 4,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkSoft,
  },
});
