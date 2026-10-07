import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "@/components/specimen/Icon";

import { TextButton } from "@/components/ui/Button";
import { Sheet } from "@/components/specimen/Sheet";
import { Screen } from "@/components/ui/Screen";
import { TrustBanner } from "@/components/ui/TrustBanner";
import { COPY } from "@/lib/copy";
import { Accent, Ink, Measure, SpecimenType } from "@/lib/specimen-tokens";

type OnboardingShellProps = {
  /** 1, 2, or 3 — three screens in this flow. */
  step: 1 | 2 | 3;
  icon: IconName;
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
  /** Renders a back chevron on the left of the top row. */
  onBack?: () => void;
};

/**
 * Shared look for welcome, disclaimer, and terms: one idea, one sheet, dots.
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
  onBack,
}: OnboardingShellProps) {
  return (
    <Screen scroll contentPadding={Measure.gutter}>
      {onBack || onSkip ? (
        <View style={styles.topRow}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={onBack}
              hitSlop={8}
              style={styles.backHit}
            >
              <Icon
                name="chevron-left"
                size={22}
                color={Accent.tag}
              />
            </Pressable>
          ) : (
            <View style={styles.skipSpacer} />
          )}
          {onSkip ? (
            <TextButton
              title={COPY.onboardingSkip}
              onPress={onSkip}
              style={styles.skipBtn}
              accessibilityLabel={COPY.onboardingSkip}
            />
          ) : null}
        </View>
      ) : (
        <View style={styles.skipSpacer} />
      )}

      {showTrustBanner ? (
        <View style={styles.trust}>
          <TrustBanner />
        </View>
      ) : null}

      <Sheet style={styles.panel}>
        {illustration ? (
          <View style={styles.illustration}>{illustration}</View>
        ) : (
          <View style={styles.iconCircle}>
            <Icon name={icon} size={24} color={Accent.tag} />
          </View>
        )}

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>

        {children}
      </Sheet>

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
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  backHit: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
  },
  skipBtn: {
    marginTop: 0,
  },
  skipSpacer: {
    minHeight: 44,
  },
  trust: {
    marginBottom: Measure.base,
  },
  panel: {
    padding: Measure.loose,
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
    backgroundColor: Accent.tagWash,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  title: {
    fontFamily: SpecimenType.serif,
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.5,
    color: Accent.tag,
  },
  body: {
    marginTop: 12,
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    lineHeight: 26,
    color: Ink.soft,
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
    backgroundColor: Accent.tag,
  },
  dotIdle: {
    backgroundColor: Ink.rule,
  },
});
