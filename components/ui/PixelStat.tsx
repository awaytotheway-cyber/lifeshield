import { StyleSheet, Text, View } from "react-native";

import { MonoLabel } from "@/components/ui/MonoLabel";
import { colors, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type PixelStatProps = {
  /** Small uppercase mono caption above the numeral. */
  label: string;
  /** The oversized value — a short string like "62%", "1/4", "8k". */
  value: string;
  /** Optional small caption under the numeral. */
  caption?: string;
  /** "black" (default) uses ink on paper; "onOrange" uses ink on orange. */
  tone?: "black" | "onOrange";
  /** Numeral font size. Never below 60. */
  size?: number;
};

/**
 * SwimClub oversized pixel numeral. The most distinctive visual moment
 * in the system — bitmap face at 90–105px on a saturated ground so it
 * reads like an LCD readout. Only for genuine numbers (percentages,
 * fractions, counts) — never for decorative UI numerals.
 */
export function PixelStat({
  label,
  value,
  caption,
  tone = "black",
  size = 96,
}: PixelStatProps) {
  const textColor = colors.inkBlack; // Both tones use ink for the numeral.
  return (
    <View style={styles.wrap}>
      <MonoLabel size={12} color={textColor}>
        {label}
      </MonoLabel>
      <Text
        style={[
          styles.value,
          {
            fontSize: size,
            lineHeight: size,
            color: textColor,
          },
        ]}
      >
        {value}
      </Text>
      {caption ? (
        <Text
          style={[
            styles.caption,
            { color: tone === "onOrange" ? colors.inkBlack : colors.ironGray },
          ]}
        >
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  value: {
    fontFamily: fontFamily.pixel,
    marginTop: spacing.sm,
  },
  caption: {
    fontFamily: fontFamily.grotesk,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
});
