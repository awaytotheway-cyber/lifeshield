import type { ReactNode } from "react";
import { StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from "react-native";

import { colors } from "@/lib/design-tokens";
import { typography } from "@/lib/typography";

type TextTokenProps = Omit<TextProps, "style"> & {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  /** Centre the text. Only for hero headlines and empty states. */
  centered?: boolean;
};

/**
 * Typed text components.
 *
 * Use these instead of a bare Text carrying only Tailwind classes. A size
 * class such as text-2xl sets the size but not the family, so that Text
 * silently renders in the platform system font — which is how a screen ends up looking nothing
 * like the rest of the app. These bind size, weight, line height, tracking
 * and colour together from lib/typography.ts, so a screen cannot drift.
 *
 * Left alignment is the default throughout: the design system centres only
 * hero headlines and empty states, never body copy.
 */

/** Screen title. One per screen. */
export function ScreenTitle({ children, style, centered, ...rest }: TextTokenProps) {
  return (
    <Text
      accessibilityRole="header"
      {...rest}
      style={[styles.screenTitle, centered && styles.centered, style]}
    >
      {children}
    </Text>
  );
}

/** Section heading inside a screen. */
export function SectionTitle({ children, style, centered, ...rest }: TextTokenProps) {
  return (
    <Text
      accessibilityRole="header"
      {...rest}
      style={[styles.sectionTitle, centered && styles.centered, style]}
    >
      {children}
    </Text>
  );
}

/** Card or list-item title. */
export function CardTitle({ children, style, centered, ...rest }: TextTokenProps) {
  return (
    <Text {...rest} style={[styles.cardTitle, centered && styles.centered, style]}>
      {children}
    </Text>
  );
}

/** Body copy. */
export function BodyText({ children, style, centered, ...rest }: TextTokenProps) {
  return (
    <Text {...rest} style={[styles.body, centered && styles.centered, style]}>
      {children}
    </Text>
  );
}

/** Body copy that needs weight without becoming a heading. */
export function BodyEmphasis({ children, style, centered, ...rest }: TextTokenProps) {
  return (
    <Text {...rest} style={[styles.bodyEmphasis, centered && styles.centered, style]}>
      {children}
    </Text>
  );
}

/** Secondary / supporting copy. */
export function BodySmall({ children, style, centered, ...rest }: TextTokenProps) {
  return (
    <Text {...rest} style={[styles.bodySm, centered && styles.centered, style]}>
      {children}
    </Text>
  );
}

/** Caption or field label. */
export function Caption({ children, style, centered, ...rest }: TextTokenProps) {
  return (
    <Text {...rest} style={[styles.caption, centered && styles.centered, style]}>
      {children}
    </Text>
  );
}

/**
 * Inline error or validation message.
 *
 * Uses riskHighText rather than the vivid riskHigh, which is a fill colour
 * and only reaches 3.55:1 on white — under AA for text this size.
 */
export function ErrorText({ children, style, centered, ...rest }: TextTokenProps) {
  return (
    <Text {...rest} style={[styles.error, centered && styles.centered, style]}>
      {children}
    </Text>
  );
}

/** A number: score, percentage, count. Always DM Mono. */
export function DataValue({ children, style, centered, ...rest }: TextTokenProps) {
  return (
    <Text {...rest} style={[styles.data, centered && styles.centered, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  screenTitle: { ...typography.h1, color: colors.deepNavy },
  sectionTitle: { ...typography.h2, color: colors.deepNavy },
  cardTitle: { ...typography.h3, color: colors.deepNavy },
  body: { ...typography.body, color: colors.charcoal },
  bodyEmphasis: { ...typography.bodyEmphasis, color: colors.charcoal },
  bodySm: { ...typography.bodySm, color: colors.slate },
  caption: { ...typography.label, color: colors.slate },
  data: { ...typography.data, color: colors.deepNavy },
  error: { ...typography.bodySm, color: colors.riskHighText },
  centered: { textAlign: "center" },
});
