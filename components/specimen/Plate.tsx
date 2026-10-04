import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Image } from "expo-image";

import {
  Edge,
  Ink,
  Measure,
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
  /** Hide the caption strip (used for small decorative plates). */
  bare?: boolean;
  style?: ViewStyle;
};

/**
 * An archival plate, mounted the way a print is mounted: deep paper
 * surround, hairline frame, printed caption and source credit beneath.
 *
 * Source imagery is public domain (Europeana / NYPL). The credit line is
 * not optional decoration — it is why this reads as a real archive
 * rather than stock texture, and it keeps attribution honest.
 */
export function Plate({
  plate,
  height = 190,
  figure,
  bare = false,
  style,
}: PlateProps) {
  const p = PLATES[plate];
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.window, { height }]}>
        <Image
          source={{ uri: p.uri }}
          style={StyleSheet.absoluteFillObject}
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

      {bare ? null : (
        <View style={styles.captionBlock}>
          <Text style={styles.caption}>{p.caption}</Text>
          <Text style={styles.credit}>{p.credit}</Text>
        </View>
      )}
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
    ...StyleSheet.absoluteFillObject,
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
  captionBlock: {
    paddingTop: Measure.snug,
    paddingHorizontal: 2,
  },
  caption: {
    fontFamily: SpecimenType.serif,
    fontSize: 14,
    lineHeight: 19,
    color: Ink.full,
  },
  credit: {
    marginTop: 3,
    fontFamily: SpecimenType.mono,
    fontSize: SpecimenType.catalogue,
    letterSpacing: TRACK.catalogue,
    color: Ink.ghost,
  },
});
