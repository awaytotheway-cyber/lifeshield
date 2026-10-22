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
  size: "xl" | "l";
  /** Set on a moss ground: grey switches to a pale moss and bold to white. */
  onMoss?: boolean;
};

/** Grey on a moss ground. Pale enough to lift off the gradient, not sink in. */
const GREY_ON_MOSS = "#C8D59A";

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
 * `size` offers nothing below `displayL` (34px).
 */
export function TwoTone({ parts, size, onMoss = false }: TwoToneProps) {
  const base = size === "xl" ? typography.displayXL : typography.displayL;

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
