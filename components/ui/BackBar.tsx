import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/specimen/Icon";
import * as Haptics from "expo-haptics";
import { Accent, Measure, SpecimenType, tapTarget } from "@/lib/specimen-tokens";

type BackBarProps = {
  onPress: () => void;
  /** Visible text next to the chevron. Default "Back". */
  label?: string;
  accessibilityLabel?: string;
};

/**
 * Lightweight back affordance for screens that are not fronted by a
 * PageHead. Left-aligned chevron + label, full 44pt tap target.
 */
export function BackBar({
  onPress,
  label = "Back",
  accessibilityLabel,
}: BackBarProps) {
  const press = () => {
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync().catch(() => {});
    }
    onPress();
  };

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        onPress={press}
        hitSlop={8}
        style={({ pressed }) => [styles.hit, pressed ? { opacity: 0.6 } : null]}
      >
        <Icon name="chevron-left" size={22} color={Accent.tag} />
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Measure.tight,
  },
  hit: {
    minHeight: tapTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingRight: Measure.snug,
  },
  label: {
    fontFamily: SpecimenType.semibold,
    fontSize: SpecimenType.body,
    color: Accent.tag,
  },
});
