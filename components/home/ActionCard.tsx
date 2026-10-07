import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "@/components/specimen/Icon";

import { Sheet } from "@/components/specimen/Sheet";
import { IconContainer } from "@/components/ui/IconContainer";
import { Accent, Ink, Measure, SpecimenType } from "@/lib/specimen-tokens";

type ActionCardProps = {
  icon: IconName;
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
        <Sheet padding={16}>
          <View style={styles.row}>
            <IconContainer icon={icon} size="md" variant="tag" />
            <View style={styles.center}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Icon
              name="chevron-right"
              size={20}
              color={Ink.faint}
            />
          </View>
        </Sheet>
      </Pressable>
      {isNew ? <View style={styles.newDot} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Measure.snug,
  },
  center: {
    flex: 1,
  },
  title: {
    fontFamily: SpecimenType.semibold,
    fontSize: 18,
    color: Ink.full,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: SpecimenType.regular,
    fontSize: SpecimenType.secondary,
    color: Ink.faint,
  },
  newDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Accent.tag,
  },
});
