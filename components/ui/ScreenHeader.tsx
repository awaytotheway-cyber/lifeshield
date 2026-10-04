import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

import { SpecimenIcon } from "@/components/specimen/SpecimenIcon";
import { Ink, Measure, Rule, SpecimenType, TRACK } from "@/lib/specimen-tokens";

type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  backLabel?: string;
};

/**
 * Catalogue head — SPECIMEN.
 * Back affordance, signature heavy-over-hair double rule, serif title.
 */
export function ScreenHeader({
  title,
  onBack,
  backLabel = "Back",
}: ScreenHeaderProps) {
  const back = () => {
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync().catch(() => {});
    }
    onBack?.();
  };

  return (
    <View style={styles.wrap}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          onPress={back}
          hitSlop={10}
          style={({ pressed }) => [
            styles.backRow,
            pressed ? { opacity: 0.55 } : null,
          ]}
        >
          <SpecimenIcon name="chevronLeft" size={15} color={Ink.soft} />
          <Text style={styles.backText}>{backLabel.toUpperCase()}</Text>
        </Pressable>
      ) : null}

      <View style={styles.ruleHeavy} />
      <View style={styles.ruleHair} />

      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: Measure.base,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 40,
    alignSelf: "flex-start",
  },
  backText: {
    fontFamily: SpecimenType.mono,
    fontSize: SpecimenType.annotation,
    letterSpacing: TRACK.label,
    color: Ink.soft,
  },
  ruleHeavy: {
    height: Rule.heavy,
    backgroundColor: Ink.full,
  },
  ruleHair: {
    height: Rule.hair,
    backgroundColor: Ink.full,
    marginTop: 2.5,
  },
  title: {
    marginTop: Measure.base,
    fontFamily: SpecimenType.serif,
    fontSize: SpecimenType.plateTitle,
    lineHeight: SpecimenType.plateTitle * 1.1,
    letterSpacing: TRACK.title,
    color: Ink.full,
  },
});
