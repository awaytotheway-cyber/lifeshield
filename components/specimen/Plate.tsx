import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Image } from "expo-image";

import {
  Edge,
  Ink,
  PLATES,
  Paper,
  Rule,
  SpecimenType,
  TRACK,
  type PlateKey,
} from "@/lib/specimen-tokens";

type PlateProps = {
  plate: PlateKey;
  height?: number;
  /** Catalogue reference printed in the corner, e.g. "PL. 04". */
  figure?: string;
  /** Retained for call-site compatibility; plates no longer caption. */
  bare?: boolean;
  style?: ViewStyle;
};

/**
 * An archival plate, mounted the way a print is mounted: deep paper
 * surround, hairline frame, optional figure reference in the corner.
 *
 * Source imagery is public domain, so no attribution line is rendered —
 * the originals' Dutch and Latin titles described the source object and
 * meant nothing to a reader looking at their own health record.
 */
export function Plate({
  plate,
  height = 190,
  figure,
  bare: _bare = false,
  style,
}: PlateProps) {
  const p = PLATES[plate];
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.window, { height }]}>
        <Image
          source={{ uri: p.uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={240}
        />
        {/* Paper warms the image so it sits on the stock, not on top of it. */}
        <View pointerEvents="none" style={styles.warmth} />
        {figure ? (
          <View style={styles.figureTag}>
            <Text style={styles.figureText}>{figure.toUpperCase()}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Paper.plate,
    borderWidth: Rule.hair,
    borderColor: Ink.ruleStrong,
    borderRadius: Edge.mount,
    padding: 10,
  },
  window: {
    width: "100%",
    backgroundColor: Paper.sheetDeep,
    borderWidth: Rule.hair,
    borderColor: Ink.rule,
    overflow: "hidden",
  },
  warmth: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(245,242,235,0.10)",
  },
  figureTag: {
    position: "absolute",
    left: 0,
    bottom: 0,
    backgroundColor: Paper.sheet,
    borderTopWidth: Rule.hair,
    borderRightWidth: Rule.hair,
    borderColor: Ink.rule,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  figureText: {
    fontFamily: SpecimenType.mono,
    fontSize: SpecimenType.catalogue,
    letterSpacing: TRACK.catalogue,
    color: Ink.soft,
  },
});
