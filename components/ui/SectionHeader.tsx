import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors, Spacing, Typography } from "@/lib/design-tokens";

type SectionHeaderAction = {
  label: string;
  onPress: () => void;
};

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: SectionHeaderAction;
};

/**
 * Standard section header. Use before every major content group — never
 * raw `<Text>` for section titles.
 */
export function SectionHeader({
  title,
  subtitle,
  action,
}: SectionHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action ? (
        <Pressable accessibilityRole="button" onPress={action.onPress}>
          <Text style={styles.action}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Typography.semibold,
    fontSize: Typography.sectionTitle,
    lineHeight: Typography.sectionTitle + 6,
    letterSpacing: -0.3,
    color: Colors.charcoal,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: Typography.regular,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.bodyText,
  },
  action: {
    fontFamily: Typography.semibold,
    fontSize: 16,
    color: Colors.orangeDark,
  },
});
