import { Platform, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import * as Haptics from "expo-haptics";

import { Edge, Ink, Measure, Paper, Rule, SpecimenType, TRACK } from "@/lib/specimen-tokens";

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
  paddingH = Measure.gutter,
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
            accessibilityLabel={chip.label.toUpperCase()}
            onPress={() => {
              if (Platform.OS !== "web") {
                void Haptics.selectionAsync().catch(() => {});
              }
              onChange(chip.value);
            }}
            style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
          >
            <Text
              style={[styles.text, active ? styles.textActive : styles.textIdle]}
            >
              {chip.label.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Measure.tight,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Edge.tag,
    borderWidth: Rule.hair,
  },
  chipActive: {
    backgroundColor: Ink.full,
    borderColor: Ink.full,
  },
  chipIdle: {
    backgroundColor: Paper.mount,
    borderColor: Ink.rule,
  },
  text: {
    fontFamily: SpecimenType.mono,
    fontSize: SpecimenType.catalogue,
    letterSpacing: TRACK.label,
  },
  textActive: {
    color: Paper.sheet,
  },
  textIdle: {
    color: Ink.soft,
  },
});
