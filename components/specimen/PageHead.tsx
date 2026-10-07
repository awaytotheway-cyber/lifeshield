import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";

import { SpecimenIcon } from "@/components/specimen/SpecimenIcon";
import {
  Ink,
  Measure,
  Paper,
  Rule,
  SpecimenType,
  TRACK,
} from "@/lib/specimen-tokens";

type PageHeadProps = {
  children?: ReactNode;
  height?: number;
  bottomRadius?: number;
  paddingH?: number;
  onBack?: () => void;
  backLabel?: string;
};

/**
 * The head of a page: an optional back row, then the signature
 * heavy-over-hair double rule, then whatever title the screen sets.
 *
 * `height` is a minimum, not a reservation — a paper head sizes to its
 * content rather than holding open a slab of colour.
 */
export function PageHead({
  children,
  height = 180,
  paddingH = Measure.gutter,
  onBack,
  backLabel = "Back",
}: PageHeadProps) {
  const back = () => {
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync().catch(() => {});
    }
    onBack?.();
  };

  return (
    <View style={styles.outer}>
      <SafeAreaView edges={["top"]}>
        <View style={[styles.content, { paddingHorizontal: paddingH }]}>
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

          <View style={[styles.body, { minHeight: Math.max(0, height - 110) }]}>
            {children}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: Paper.sheet,
  },
  content: {
    paddingTop: Measure.tight,
    paddingBottom: Measure.loose,
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
  body: {
    paddingTop: Measure.base,
    justifyContent: "flex-end",
  },
});
