import { useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { Icon } from "@/components/specimen/Icon";
import * as Haptics from "expo-haptics";
import { Accent, Edge, Ink, Measure, Paper, SpecimenType } from "@/lib/specimen-tokens";

type ChoiceCardProps = {
  label: string;
  sublabel?: string;
  selected?: boolean;
  onPress: () => void;
  /** 'default' = full-width stacked; 'yes-no' = sized for horizontal row. */
  variant?: "default" | "yes-no";
  style?: ViewStyle;
};

/**
 * Full-width tappable option. Replaces radios + checkboxes everywhere.
 * Selected = orange tint + orange border + inline checkmark.
 */
export function ChoiceCard({
  label,
  sublabel,
  selected = false,
  onPress,
  variant = "default",
  style,
}: ChoiceCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const press = async () => {
    if (Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // non-fatal
      }
    }
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }], flex: variant === "yes-no" ? 1 : undefined }}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
        onPressIn={() =>
          Animated.timing(scale, {
            toValue: 0.98,
            duration: 90,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
        }
        onPress={press}
        style={[
          styles.card,
          selected ? styles.selected : styles.idle,
          style,
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, selected && styles.labelSelected]}>
            {label}
          </Text>
          {sublabel ? (
            <Text style={styles.sublabel}>{sublabel}</Text>
          ) : null}
        </View>
        {selected ? (
          <Icon name="check" size={18} color={Accent.tag} />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 58,
    paddingHorizontal: Measure.wide,
    paddingVertical: Measure.snug,
    borderRadius: Edge.mount,
    flexDirection: "row",
    alignItems: "center",
    gap: Measure.snug,
  },
  idle: {
    backgroundColor: Paper.mount,
    borderWidth: 1.5,
    borderColor: Ink.rule,
  },
  selected: {
    backgroundColor: Accent.tagWash,
    borderWidth: 2,
    borderColor: Accent.tag,
  },
  label: {
    fontFamily: SpecimenType.semibold,
    fontSize: SpecimenType.bodyLarge,
    color: Ink.full,
  },
  labelSelected: {
    color: Accent.tag,
  },
  sublabel: {
    marginTop: 2,
    fontFamily: SpecimenType.regular,
    fontSize: SpecimenType.secondary,
    color: Ink.soft,
  },
});
