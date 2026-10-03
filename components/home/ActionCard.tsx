import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { GlassCard } from "@/components/ui/GlassCard";
import { IconContainer } from "@/components/ui/IconContainer";
import { Colors, Spacing, Typography } from "@/lib/design-tokens";

type ActionCardProps = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  /** Small orange dot in the top-right corner (not a chip, not a badge). */
  isNew?: boolean;
};

export function ActionCard({
  icon,
  title,
  subtitle,
  onPress,
  isNew,
}: ActionCardProps) {
  return (
    <View style={{ position: "relative" }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={onPress}
        style={({ pressed }) => [pressed ? { opacity: 0.9 } : null]}
      >
        <GlassCard variant="onWhite" padding={16}>
          <View style={styles.row}>
            <IconContainer icon={icon} size="md" variant="orange" />
            <View style={styles.center}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Feather
              name="chevron-right"
              size={20}
              color={Colors.mutedText}
            />
          </View>
        </GlassCard>
      </Pressable>
      {isNew ? <View style={styles.newDot} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  center: {
    flex: 1,
  },
  title: {
    fontFamily: Typography.semibold,
    fontSize: 16,
    color: Colors.charcoal,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: Typography.regular,
    fontSize: Typography.secondary,
    color: Colors.mutedText,
  },
  newDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.orangeDark,
  },
});
