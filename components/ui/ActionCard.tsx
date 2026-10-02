import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Card } from "@/components/ui/Card";
import { Colors, Size, Space, typeStyle } from "@/lib/theme";

type ActionCardProps = {
  title: string;
  subtitle?: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  /** Right-hand hint text shown instead of the chevron (e.g. "3 new"). */
  value?: string;
};

/**
 * Spacious tappable card: 44px orange-tint icon square, title, subtitle, chevron.
 * Used for the "Today" list on Home and for any primary action surfaced on a screen.
 */
export function ActionCard({
  title,
  subtitle,
  icon,
  onPress,
  value,
}: ActionCardProps) {
  return (
    <Card onPress={onPress} accessibilityLabel={title} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconSquare}>
          <Feather name={icon} size={20} color={Colors.orange} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {value ? <Text style={styles.value}>{value}</Text> : null}
        <Feather name="chevron-right" size={20} color={Colors.faint} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 80,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },
  iconSquare: {
    width: Size.iconSquare,
    height: Size.iconSquare,
    borderRadius: 14,
    backgroundColor: Colors.orangeTint,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
  },
  title: {
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  subtitle: {
    ...typeStyle("secondary"),
    marginTop: 4,
    color: Colors.muted,
  },
  value: {
    ...typeStyle("label"),
    color: Colors.orange,
  },
});
