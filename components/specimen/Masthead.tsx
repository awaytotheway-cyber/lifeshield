import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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

type MastheadProps = {
  /** Printed above the title, tracked out. */
  eyebrow?: string;
  title: string;
  /** Catalogue ref, printed right-aligned on the rule. */
  reference?: string;
  onBack?: () => void;
  backLabel?: string;
  right?: ReactNode;
};

/**
 * The page masthead — modelled on the head of a printed catalogue entry
 * rather than an app navigation bar.
 *
 *   SECTION · tracked small caps          CAT. REF
 *   ─────────────────────────────────────────────
 *   Serif Title Set Large
 *
 * The double rule (heavy over hair) is the signature. It costs nothing
 * and immediately reads as typeset rather than templated.
 */
export function Masthead({
  eyebrow,
  title,
  reference,
  onBack,
  backLabel = "Back",
  right,
}: MastheadProps) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.inner}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            onPress={onBack}
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

        <View style={styles.eyebrowRow}>
          {eyebrow ? (
            <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
          ) : (
            <View />
          )}
          {reference ? (
            <Text style={styles.reference}>{reference.toUpperCase()}</Text>
          ) : null}
        </View>

        {/* Signature double rule. */}
        <View style={styles.ruleHeavy} />
        <View style={styles.ruleHair} />

        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {right ? <View style={styles.right}>{right}</View> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: Paper.sheet,
  },
  inner: {
    paddingHorizontal: Measure.gutter,
    paddingTop: Measure.snug,
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
    fontFamily: SpecimenType.sansMedium,
    fontSize: SpecimenType.annotation,
    letterSpacing: TRACK.label,
    color: Ink.soft,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  eyebrow: {
    fontFamily: SpecimenType.sansMedium,
    fontSize: SpecimenType.annotation,
    letterSpacing: TRACK.label,
    color: Ink.faint,
  },
  reference: {
    fontFamily: SpecimenType.mono,
    fontSize: SpecimenType.catalogue,
    letterSpacing: TRACK.catalogue,
    color: Ink.ghost,
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
  titleRow: {
    marginTop: Measure.base,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: Measure.snug,
  },
  title: {
    flex: 1,
    fontFamily: SpecimenType.serif,
    fontSize: SpecimenType.plateTitle,
    lineHeight: SpecimenType.plateTitle * 1.1,
    letterSpacing: TRACK.title,
    color: Ink.full,
  },
  right: {
    paddingBottom: 4,
  },
});
