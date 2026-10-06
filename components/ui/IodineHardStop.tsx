import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";
import { COPY } from "@/lib/copy";
import { Icon } from "@/components/ui/Icon";

type IodineHardStopProps = {
  reason?: string;
};

/**
 * Shown when iodine is not recommended. Calm amber, not a crash or scare.
 */
export function IodineHardStop({
  reason = "Because your thyroid antibodies are positive, iodine supplementation could cause a flare-up. Your plan has been adjusted to keep you safe.",
}: IodineHardStopProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Icon name="alert-triangle" size={20} color={colors.riskModerate} />
        <Text style={styles.title}>{COPY.iodineHardStopTitle}</Text>
      </View>
      <Text style={styles.body}>{reason}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.riskModerateLight,
    borderWidth: 1,
    borderColor: colors.riskModerate,
    borderRadius: radius.alert,
    padding: spacing.base,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.bodySemi,
    fontSize: 17,
    color: colors.charcoal,
  },
  body: {
    marginTop: 8,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.charcoal,
  },
});
