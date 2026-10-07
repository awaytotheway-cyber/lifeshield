import { Pressable, StyleSheet, Text, View } from "react-native";
import { Accent, Ink, Measure, SpecimenType } from "@/lib/specimen-tokens";

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
    gap: Measure.snug,
    marginBottom: Measure.snug,
  },
  title: {
    fontFamily: SpecimenType.semibold,
    fontSize: SpecimenType.sectionTitle,
    lineHeight: SpecimenType.sectionTitle + 6,
    letterSpacing: -0.3,
    color: Ink.full,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: SpecimenType.regular,
    fontSize: 16,
    lineHeight: 24,
    color: Ink.soft,
  },
  action: {
    fontFamily: SpecimenType.semibold,
    fontSize: 16,
    color: Accent.tag,
  },
});
