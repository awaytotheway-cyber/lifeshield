import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import { SpecimenIcon } from "@/components/specimen/SpecimenIcon";
import {
  Edge,
  Ink,
  Measure,
  PLATES,
  Paper,
  Rule,
  SpecimenType,
  TRACK,
} from "@/lib/specimen-tokens";

type FeaturedBannerProps = {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onPress?: () => void;
};

/**
 * The featured collection — SPECIMEN.
 *
 * Was a gradient card with decorative circles. It is now a mounted
 * plate: an archival image on the left, typeset copy on the right,
 * hairline frame.
 */
export function FeaturedBanner({
  title,
  subtitle,
  ctaLabel,
  onPress,
}: FeaturedBannerProps) {
  const plate = PLATES.herbariumAllium;

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={title}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.wrap,
        pressed && onPress ? { opacity: 0.92 } : null,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.window}>
          <Image
            source={{ uri: plate.uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={240}
          />
        </View>

        <View style={styles.copy}>
          <Text style={styles.eyebrow}>SELECTED</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {ctaLabel ? (
            <View style={styles.ctaRow}>
              <Text style={styles.cta}>{ctaLabel.toUpperCase()}</Text>
              <SpecimenIcon name="chevronRight" size={13} color={Ink.full} />
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Paper.mount,
    borderWidth: Rule.hair,
    borderColor: Ink.ruleStrong,
    borderRadius: Edge.mount,
    padding: 10,
  },
  row: {
    flexDirection: "row",
    gap: Measure.base,
  },
  window: {
    width: 104,
    alignSelf: "stretch",
    minHeight: 132,
    backgroundColor: Paper.sheetDeep,
    borderWidth: Rule.hair,
    borderColor: Ink.rule,
    overflow: "hidden",
  },
  copy: {
    flex: 1,
    paddingVertical: 2,
  },
  eyebrow: {
    fontFamily: SpecimenType.mono,
    fontSize: SpecimenType.catalogue,
    letterSpacing: TRACK.label,
    color: Ink.faint,
  },
  title: {
    marginTop: 6,
    fontFamily: SpecimenType.serif,
    fontSize: 21,
    lineHeight: 25,
    letterSpacing: TRACK.title,
    color: Ink.full,
  },
  subtitle: {
    marginTop: 7,
    fontFamily: SpecimenType.mono,
    fontSize: SpecimenType.annotation,
    lineHeight: 18,
    color: Ink.soft,
  },
  ctaRow: {
    marginTop: Measure.snug,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  cta: {
    fontFamily: SpecimenType.mono,
    fontSize: SpecimenType.catalogue,
    letterSpacing: TRACK.label,
    color: Ink.full,
    textDecorationLine: "underline",
  },
});
