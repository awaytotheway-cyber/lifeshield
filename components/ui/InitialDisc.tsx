import { StyleSheet, Text, View } from "react-native";

import { colors, radius } from "@/lib/design-tokens";
import { initialsFor } from "@/lib/initials";
import { fontFamily } from "@/lib/typography";

type InitialDiscProps = {
  name: string;
  /** Diameter in points. Default 46. */
  size?: number;
  variant?: "moss" | "clay";
};

/** Ground and text for each variant. Clay borrows the `worthWatching` pair. */
const variants = {
  moss: { fill: colors.mossTint, text: "#4A5612" },
  clay: { fill: "#F0E6D2", text: "#7A5610" },
} as const;

/**
 * A round monogram — the Moss stand-in for an avatar.
 *
 * Returns `null` when the name yields no initials. A user who has not given a
 * name renders nothing at all rather than a hollow circle, so an empty profile
 * reads as absent rather than broken.
 */
export function InitialDisc({
  name,
  size = 46,
  variant = "moss",
}: InitialDiscProps) {
  const initials = initialsFor(name);
  if (initials.length === 0) return null;

  const palette = variants[variant];

  return (
    <View
      style={[
        styles.disc,
        {
          width: size,
          height: size,
          backgroundColor: palette.fill,
        },
      ]}
    >
      <Text
        style={[
          styles.initials,
          {
            color: palette.text,
            // 0.37 of the diameter: 17pt inside the 46pt default.
            fontSize: Math.round(size * 0.37),
          },
        ]}
        // One or two glyphs must never wrap or shrink to two lines.
        numberOfLines={1}
        // The disc is a fixed circle, so unbounded scaling would clip the
        // monogram — but a cap still honours part of the user's text setting,
        // where switching scaling off would honour none of it.
        maxFontSizeMultiplier={1.3}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: "center",
    borderRadius: radius.pill,
    justifyContent: "center",
  },
  initials: {
    fontFamily: fontFamily.displaySemi,
    letterSpacing: 0.2,
  },
});
