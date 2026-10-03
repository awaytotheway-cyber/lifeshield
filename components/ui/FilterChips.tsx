import { Platform, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { Colors, Radii, Spacing, Typography } from "@/lib/design-tokens";

export type FilterChip = {
  value: string;
  label: string;
};

type FilterChipsProps = {
  chips: readonly FilterChip[];
  value: string;
  onChange: (value: string) => void;
  /** Horizontal padding for the scroll content. Default Spacing.screenH. */
  paddingH?: number;
};

/**
 * Horizontal filter chip row. The active chip is filled with the brand
 * gradient; inactive chips are outlined.
 */
export function FilterChips({
  chips,
  value,
  onChange,
  paddingH = Spacing.screenH,
}: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingHorizontal: paddingH }]}
    >
      {chips.map((chip) => {
        const active = chip.value === value;
        return (
          <Pressable
            key={chip.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={chip.label}
            onPress={() => {
              if (Platform.OS !== "web") {
                void Haptics.selectionAsync().catch(() => {});
              }
              onChange(chip.value);
            }}
            style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
          >
            {active ? (
              <LinearGradient
                colors={[Colors.orangeDark, Colors.orangeBright]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
            ) : null}
            <Text
              style={[styles.text, active ? styles.textActive : styles.textIdle]}
            >
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.chip,
    overflow: "hidden",
  },
  chipActive: {
    backgroundColor: Colors.orangeDark,
  },
  chipIdle: {
    backgroundColor: Colors.pureWhite,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  text: {
    fontFamily: Typography.medium,
    fontSize: Typography.label,
  },
  textActive: {
    color: Colors.pureWhite,
  },
  textIdle: {
    color: Colors.bodyText,
  },
});
