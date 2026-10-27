import { StyleSheet, Text } from "react-native";

import { colors } from "@/lib/design-tokens";
import { fontFamily, typography } from "@/lib/typography";

/** One run of a two-tone headline. */
export type TwoTonePart = {
  text: string;
  tone: "bold" | "grey";
};

type TwoToneProps = {
  /**
   * The headline, split into runs. Runs render **exactly** as given and are
   * never joined with a space — carry your own spacing and punctuation inside
   * `text`, e.g.
   * `[{ text: "Know your ", tone: "grey" }, { text: "numbers", tone: "bold" }]`.
   */
  parts: TwoTonePart[];
  size: TwoToneSize;
  /** Set on a moss ground: grey switches to a pale moss and bold to white. */
  onMoss?: boolean;
};

/**
 * `xl` and `l` are the two display tokens and read their metrics straight out
 * of `typography`. `m` is 28 — the one step below `displayL` where the grey
 * run is still legible. Any other size is given as a number, in points, so a
 * screen whose board calls for 38 or 44 does not have to round to the nearest
 * name; the metrics are then derived from the display scale below.
 */
export type TwoToneSize = "xl" | "l" | "m" | number;

/** `m` in points. Named because 28 recurs; numbers are for one-offs. */
const SIZE_M = 28;

/**
 * The floor. Grey is `inkFaint`, which only clears its contrast at display
 * sizes, so no headline may ask for less than 24 — a smaller size is clamped
 * up here rather than rendered illegibly.
 */
const MIN_SIZE = 24;

/** Above this the display face tightens its leading from 1.0 to 0.92. */
const TIGHT_LEADING_FROM = 40;

/** Grey on a moss ground. Pale enough to lift off the gradient, not sink in. */
const GREY_ON_MOSS = "#C8D59A";

type TwoToneMetrics = {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
};

/**
 * Display metrics for a size.
 *
 * `xl` and `l` return the exact token values so the screens already built on
 * them do not shift by a point. Everything else is derived the way the scale
 * itself was: leading 1.0, tightening to 0.92 once the type is big enough to
 * carry it, and tracking at -3.2% of the size — the midpoint of the scale's
 * -3% (34) and -3.5% (46), converted to points because React Native takes
 * `letterSpacing` in points rather than ems.
 */
function metricsFor(size: TwoToneSize): TwoToneMetrics {
  if (size === "xl") {
    return typography.displayXL;
  }
  if (size === "l") {
    return typography.displayL;
  }
  const points = Math.max(MIN_SIZE, size === "m" ? SIZE_M : size);
  const leading = points >= TIGHT_LEADING_FROM ? 0.92 : 1;
  return {
    fontSize: points,
    lineHeight: Math.round(points * leading),
    letterSpacing: Math.round(points * -0.032 * 10) / 10,
  };
}

/**
 * The Moss headline: one sentence in two tones, where the bold words carry the
 * meaning and the grey words carry the grammar.
 *
 * It renders as a single `Text` with nested runs so the whole headline wraps
 * and tracks as one block — not as a row of separate `Text` nodes, which would
 * break the sentence at the wrong places and read as N labels to a screen
 * reader instead of one headline.
 *
 * Grey is `inkFaint`, which is only legible at display sizes: that is why
 * `size` never goes below 24, whichever name or number it is given.
 */
export function TwoTone({ parts, size, onMoss = false }: TwoToneProps) {
  const base = metricsFor(size);

  const boldColor = onMoss ? colors.white : colors.ink;
  const greyColor = onMoss ? GREY_ON_MOSS : colors.inkFaint;

  return (
    <Text
      style={{
        fontSize: base.fontSize,
        lineHeight: base.lineHeight,
        letterSpacing: base.letterSpacing,
      }}
    >
      {parts.map((part, index) => {
        const bold = part.tone === "bold";
        return (
          <Text
            // Runs have no identity of their own — the headline is static copy.
            key={`${index}-${part.text}`}
            style={[
              bold ? styles.bold : styles.grey,
              { color: bold ? boldColor : greyColor },
            ]}
          >
            {part.text}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  /** 700 — the only weight the display face is allowed to use. */
  bold: {
    fontFamily: fontFamily.display,
  },
  /** 400 — the grey words sit a full three steps lighter than the bold ones. */
  grey: {
    fontFamily: fontFamily.body,
  },
});
