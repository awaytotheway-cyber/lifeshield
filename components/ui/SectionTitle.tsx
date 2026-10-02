import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Colors, Gap, Size, Space, typeStyle } from "@/lib/theme";

type SectionTitleProps = {
  title: string;
  /** One supporting line under the title. */
  subtitle?: string;
  /** Feather icon shown in a 44px orange-tint square to the left of the title. */
  icon?: keyof typeof Feather.glyphMap;
  /** Drop the 40px top margin when the title is the first thing on a screen. */
  first?: boolean;
};

/**
 * Serif section heading with generous air above and below.
 *
 * PLAIN ENGLISH: use this between sections so they feel clearly separate —
 * 40px of space above, 20px below, Fraunces serif.
 */
export function SectionTitle({
  title,
  subtitle,
  icon,
  first = false,
}: SectionTitleProps) {
  return (
    <View style={[styles.wrap, first ? styles.first : null]}>
      <View style={styles.row}>
        {icon ? (
          <View style={styles.iconSquare}>
            <Feather name={icon} size={20} color={Colors.orange} />
          </View>
        ) : null}
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Gap.sections,
    marginBottom: Space.md + 2,
  },
  first: {
    marginTop: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md - 2,
  },
  iconSquare: {
    width: Size.iconSquare,
    height: Size.iconSquare,
    borderRadius: 14,
    backgroundColor: Colors.orangeTint,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    ...typeStyle("title"),
    color: Colors.ink,
  },
  subtitle: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
  },
});
