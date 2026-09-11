import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { TextButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
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
  children?: ReactNode;
  footer: ReactNode;
};

/**
 * Shared look for welcome, disclaimer, and terms: one idea, one icon, dots.
 */
export function OnboardingShell({
  step,
  icon,
  title,
  body,
  onSkip,
  children,
  footer,
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

      <View style={styles.iconCircle}>
        <Feather name={icon} size={24} color={colors.deepTeal} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>

      {children}

      <View style={styles.dots} accessibilityRole="text" accessibilityLabel={`Step ${step} of 3`}>
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
    color: colors.deepTeal,
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
    backgroundColor: colors.deepTeal,
  },
  dotIdle: {
    backgroundColor: colors.border,
  },
});
