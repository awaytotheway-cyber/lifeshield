import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { TextButton } from "@/components/ui/Button";
import { DotProgress, type DotState } from "@/components/ui/DotProgress";
import { Screen } from "@/components/ui/Screen";
import { TrustBanner } from "@/components/ui/TrustBanner";
import { COPY } from "@/lib/copy";
import { Colors, Gap, Size, Space, typeStyle } from "@/lib/theme";

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
  /** Show the privacy reassurance panel (welcome). */
  showTrustBanner?: boolean;
};

const TOTAL_STEPS = 3;

/**
 * Shared look for welcome, disclaimer, and terms: one idea per screen, a
 * serif headline with lots of air around it, a dot indicator, and one clear
 * action pinned to the bottom.
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
  const dots: DotState[] = Array.from({ length: TOTAL_STEPS }, (_, index) => {
    const position = index + 1;
    if (position < step) {
      return "complete";
    }
    return position === step ? "current" : "upcoming";
  });

  return (
    <Screen
      scroll
      footer={<View style={styles.footer}>{footer}</View>}
    >
      <View style={styles.topRow}>
        <DotProgress
          states={dots}
          accessibilityLabel={`Step ${step} of ${TOTAL_STEPS}`}
        />
        {onSkip ? (
          <TextButton
            title={COPY.onboardingSkip}
            onPress={onSkip}
            style={styles.skipBtn}
            accessibilityLabel={COPY.onboardingSkip}
          />
        ) : null}
      </View>

      {illustration ? (
        <View style={styles.illustration}>{illustration}</View>
      ) : (
        <View style={styles.iconSquare}>
          <Feather name={icon} size={24} color={Colors.orange} />
        </View>
      )}

      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.body}>{body}</Text>

      {children}

      {showTrustBanner ? (
        <View style={styles.trust}>
          <TrustBanner />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: Size.tap,
  },
  skipBtn: {
    marginTop: 0,
  },
  illustration: {
    alignSelf: "flex-start",
    marginTop: Gap.afterTitle,
  },
  iconSquare: {
    width: Size.choiceCard,
    height: Size.choiceCard,
    borderRadius: 20,
    backgroundColor: Colors.orangeTint,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Gap.afterTitle,
  },
  title: {
    ...typeStyle("hero"),
    marginTop: Gap.afterTitle,
    color: Colors.ink,
  },
  body: {
    ...typeStyle("body"),
    marginTop: Space.md,
    color: Colors.body,
  },
  trust: {
    marginTop: Gap.sections,
  },
  footer: {
    paddingTop: Space.xs,
    paddingBottom: Space.xs,
  },
});
