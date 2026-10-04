import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";

import {
  Accent,
  Edge,
  Ink,
  Measure,
  Paper,
  Rule,
  SpecimenType,
  TRACK,
} from "@/lib/specimen-tokens";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  size?: "full" | "auto";
  /** 'ink' is the default solid block; 'outline' is a ruled alternative. */
  tone?: "ink" | "outline" | "tag";
  style?: ViewStyle;
  accessibilityLabel?: string;
};

/**
 * The action — SPECIMEN.
 *
 * A solid block of ink with a tracked small-caps label. No gradient, no
 * glow, no rounded pill: on paper an action is set, not rendered. The
 * press state darkens the block rather than scaling it.
 */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  size = "full",
  tone = "ink",
  style,
  accessibilityLabel,
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  const press = async () => {
    if (isDisabled) return;
    if (Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // Haptics unavailable — not fatal.
      }
    }
    await onPress();
  };

  const outline = tone === "outline";
  const base = tone === "tag" ? Accent.tag : Ink.full;
  const pressedFill = tone === "tag" ? "#8C2C1A" : "#36332D";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={press}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.wrap,
        size === "full" && styles.full,
        outline
          ? {
              backgroundColor: "transparent",
              borderWidth: Rule.medium,
              borderColor: isDisabled ? Ink.ghost : base,
            }
          : {
              backgroundColor: isDisabled
                ? Ink.ruleStrong
                : pressed
                  ? pressedFill
                  : base,
            },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={outline ? Ink.full : Paper.sheet}
        />
      ) : (
        <View style={styles.row}>
          <Text
            style={[
              styles.label,
              { color: outline ? (isDisabled ? Ink.ghost : base) : Paper.sheet },
            ]}
          >
            {label.toUpperCase()}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 52,
    borderRadius: Edge.none,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Measure.loose,
  },
  full: {
    alignSelf: "stretch",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Measure.tight,
  },
  label: {
    fontFamily: SpecimenType.mono,
    fontSize: SpecimenType.label,
    letterSpacing: TRACK.label,
  },
});
