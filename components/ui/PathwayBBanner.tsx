import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { DangerButton, TextButton } from "@/components/ui/Button";
import { colors, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type PathwayBBannerProps = {
  onFindDoctor?: () => void;
  onSavePlace?: () => void;
};

/**
 * Calm hand-off look for Pathway B. The full Pathway B screen is not restyled yet.
 */
export function PathwayBBanner({ onFindDoctor, onSavePlace }: PathwayBBannerProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Feather name="phone" size={24} color={colors.deepTeal} />
      </View>
      <Text style={styles.title}>Let's get you the right care</Text>
      <Text style={styles.body}>
        Based on your answers, seeing a doctor soon is the right next step. This
        app will be here when you're ready to return.
      </Text>
      {onFindDoctor ? (
        <DangerButton title="Find a doctor" onPress={onFindDoctor} />
      ) : null}
      {onSavePlace ? (
        <TextButton title="Save my place" onPress={onSavePlace} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.cream,
    padding: spacing.base,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.lightTeal,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 24,
    lineHeight: 29,
    color: colors.deepTeal,
  },
  body: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.charcoal,
  },
});
