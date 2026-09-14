import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { TextButton } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import { TrustBanner } from "@/components/ui/TrustBanner";
import { COPY } from "@/lib/copy";
import { colors, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type OnboardingShellProps = {
  /** 1, 2, or 3 — three screens in this flow. */
  step: 1 | 2 | 3;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
  /** Shown from screen 2 onward. Does not skip the terms agreement. */
  onSkip?: () => void;
  /** Optional drawing above the title. Replaces the small icon when set. */
  illustration?: ReactNode;
  children?: ReactNode;
  footer: ReactNode;
  /** Show solid trust banner (welcome). */
  showTrustBanner?: boolean;
};

/**
 * Shared look for welcome, disclaimer, and terms: one idea, glass panel, dots.
 */
export function OnboardingShell({
  step,
  icon,
  title,
  body,
  onSkip,
  illustration,
  children,
  footer,
  showTrustBanner = false,
}: OnboardingShellProps) {
  return (
    <Screen scroll contentPadding={spacing.screenX}>
      {onSkip ? (
        <View style={styles.skipRow}>
          <TextButton
            title={COPY.onboardingSkip}
            onPress={onSkip}
            style={styles.skipBtn}
            accessibilityLabel={COPY.onboardingSkip}
          />
        </View>
      ) : (
        <View style={styles.skipSpacer} />
      )}

      {showTrustBanner ? (
        <View style={styles.trust}>
          <TrustBanner />
        </View>
      ) : null}

      <GlassCard intensity="card" style={styles.panel}>
        {illustration ? (
          <View style={styles.illustration}>{illustration}</View>
        ) : (
          <View style={styles.iconCircle}>
            <Feather name={icon} size={24} color={colors.primaryBlue} />
          </View>
        )}

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>

        {children}
      </GlassCard>

      <View
        style={styles.dots}
        accessibilityRole="text"
        accessibilityLabel={`Step ${step} of 3`}
      >
        {[1, 2, 3].map((dot) => (
          <View
            key={dot}
            style={[styles.dot, dot === step ? styles.dotActive : styles.dotIdle]}
          />
        ))}
      </View>

      {footer}
    </Screen>
  );
}

const styles = StyleSheet.create({
  skipRow: {
    alignItems: "flex-end",
    minHeight: 44,
  },
  skipBtn: {
    marginTop: 0,
  },
  skipSpacer: {
    minHeight: 44,
  },
  trust: {
    marginBottom: spacing.base,
  },
  panel: {
    padding: spacing.md,
    marginBottom: 8,
  },
  illustration: {
    alignSelf: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.lightTeal,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.5,
    color: colors.primaryBlue,
  },
  body: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 32,
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: colors.primaryBlue,
  },
  dotIdle: {
    backgroundColor: colors.border,
  },
});
