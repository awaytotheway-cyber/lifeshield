import type { ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import type { Feather } from "@expo/vector-icons";

import { TextButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TrustBanner } from "@/components/ui/TrustBanner";
import { TwoTone, type TwoTonePart } from "@/components/ui/TwoTone";
import { COPY } from "@/lib/copy";
import {
  colors,
  heroGradient,
  radius,
  spacing,
  tapTarget,
} from "@/lib/design-tokens";
import { fontFamily, typography } from "@/lib/typography";

type OnboardingShellProps = {
  /** 1, 2, or 3 — three screens in this flow. */
  step: 1 | 2 | 3;
  /**
   * @deprecated Moss dropped the decorative icon badge from the onboarding
   * steps — the gradient card is the whole picture. Still accepted so the
   * three step screens keep their call signature.
   */
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
  /**
   * Optional two-tone split of `title`. Without it the whole headline is
   * bold, which is correct but flat; with it the grey words carry the
   * grammar. `title` is still what a screen reader hears if this is omitted.
   */
  titleParts?: TwoTonePart[];
  /** Shown from screen 2 onward. Does not skip the terms agreement. */
  onSkip?: () => void;
  children?: ReactNode;
  footer: ReactNode;
  /** Show the full privacy strip (welcome). Its wording is load-bearing. */
  showTrustBanner?: boolean;
};

/** 155deg on the unit box — the same band the auth hero uses. */
const GRADIENT_START = { x: 0.29, y: 0.05 };
const GRADIENT_END = { x: 0.71, y: 0.95 };

const TOTAL_STEPS = 3;

/**
 * Shared look for welcome, disclaimer and terms: wordmark and Skip up top,
 * one gradient card carrying the step eyebrow, a two-tone headline, the body,
 * then the dot row, the single ink action and the standing disclaimer.
 *
 * There is no second title, no icon badge and no repeated disclaimer — the
 * noise is gone, the clinical framing is not: `COPY.onboardingDisclaimer`
 * prints in full on every step, and `showTrustBanner` still prints the
 * privacy strip verbatim.
 */
export function OnboardingShell({
  step,
  title,
  body,
  titleParts,
  onSkip,
  children,
  footer,
  showTrustBanner = false,
}: OnboardingShellProps) {
  return (
    <Screen scroll>
      <View style={styles.topRow}>
        <Text style={styles.wordmark}>{COPY.appName}</Text>
        {onSkip ? (
          // Tertiary: a plain underlined link, never an outline or a fill.
          <TextButton
            title={COPY.onboardingSkip}
            onPress={onSkip}
            style={styles.skipBtn}
            accessibilityLabel={COPY.onboardingSkip}
          />
        ) : null}
      </View>

      {/* The one gradient on this screen. Only the step eyebrow sits on it. */}
      <LinearGradient
        colors={heroGradient.colors}
        locations={heroGradient.locations}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={styles.card}
      >
        <Text style={styles.eyebrow}>{`Step ${step} of ${TOTAL_STEPS}`}</Text>
      </LinearGradient>

      <View style={styles.content}>
        {titleParts ? (
          <TwoTone size="xl" parts={titleParts} />
        ) : (
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
        )}
        <Text style={styles.body}>{body}</Text>

        {showTrustBanner ? (
          <View style={styles.trust}>
            <TrustBanner />
          </View>
        ) : null}

        {children}

        <View
          style={styles.dots}
          accessibilityRole="text"
          accessibilityLabel={`Step ${step} of ${TOTAL_STEPS}`}
        >
          {[1, 2, 3].map((dot) => (
            <View
              key={dot}
              style={[styles.dot, dot === step ? styles.dotActive : null]}
            />
          ))}
        </View>

        {footer}

        <Text style={styles.disclaimer}>{COPY.onboardingDisclaimer}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: tapTarget,
  },
  wordmark: {
    fontFamily: fontFamily.display,
    fontSize: 13,
    // 13 x 0.18 = 2.34
    letterSpacing: 2.3,
    textTransform: "uppercase",
    color: colors.ink,
  },
  skipBtn: {
    marginTop: 0,
  },
  card: {
    marginTop: 26,
    height: 292,
    borderRadius: radius.surface,
    justifyContent: "flex-end",
    padding: 22,
  },
  eyebrow: {
    ...typography.micro,
    color: colors.mossTint,
  },
  content: {
    paddingTop: 30,
  },
  /**
   * The fallback headline when a screen gives no two-tone split. `displayL`
   * rather than `displayXL`: a single-tone 46pt wall of ink is a slab, and
   * the disclaimer and terms copy run long.
   */
  title: {
    ...typography.displayL,
    color: colors.ink,
  },
  body: {
    ...typography.body,
    marginTop: 16,
    color: colors.inkSoft,
  },
  trust: {
    marginTop: spacing.md,
  },
  dots: {
    marginTop: spacing.md,
    marginBottom: spacing.base,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  dot: {
    width: 4,
    height: 4,
    // `pill` reads identically to the board's 2pt on a 4pt bar, and it is one
    // of the three radii the system allows.
    borderRadius: radius.pill,
    backgroundColor: colors.hairline,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.ink,
  },
  disclaimer: {
    ...typography.label,
    marginTop: spacing.base,
    marginBottom: spacing.md,
    textAlign: "center",
    // 13px, so `inkMuted` — `inkFaint` is a headline colour from 24px up.
    color: colors.inkMuted,
  },
});
