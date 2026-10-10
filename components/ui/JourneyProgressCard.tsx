import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { GlassCard } from "@/components/ui/GlassCard";
import { colors, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

export type JourneyStepState = "complete" | "current" | "upcoming";

export type JourneyStepItem = {
  id: string;
  title: string;
  state: JourneyStepState;
  /** Feather glyph shown inside the indicator for the current step. */
  icon?: keyof typeof Feather.glyphMap;
  /** Short status line under the title. */
  subtitle?: string;
};

type JourneyProgressCardProps = {
  steps: JourneyStepItem[];
  onContinue?: () => void;
};

const INDICATOR = 32;

function Indicator({
  step,
  pulseNode,
}: {
  step: JourneyStepItem;
  pulseNode: ReactNode;
}) {
  if (step.state === "complete") {
    return (
      <View style={[styles.indicator, styles.indicatorComplete]}>
        <Feather name="check" size={16} color={colors.white} />
      </View>
    );
  }

  if (step.state === "current") {
    return (
      <View style={styles.indicatorWrap}>
        {pulseNode}
        <View style={[styles.indicator, styles.indicatorCurrent]}>
          <Feather name={step.icon ?? "play"} size={15} color={colors.white} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.indicator, styles.indicatorUpcoming]}>
      <Feather name="lock" size={13} color={colors.mist} />
    </View>
  );
}

/**
 * Vertical journey timeline. Completed steps carry a solid sage rail down to
 * the next step; anything not yet reached uses a dashed rail. The current
 * step is lifted onto an iceBlue card with its own Continue action.
 */
export function JourneyProgressCard({ steps, onContinue }: JourneyProgressCardProps) {
  const reduceMotion = useReducedMotion();

  const pulseStyle = useAnimatedStyle<ViewStyle>(() => {
    if (reduceMotion) {
      return { opacity: 0, transform: [{ scale: 1 }] };
    }
    return {
      opacity: withRepeat(
        withSequence(
          withTiming(0.4, { duration: 120 }),
          withTiming(0, { duration: 1380 }),
        ),
        -1,
        false,
      ),
      transform: [
        {
          scale: withRepeat(
            withSequence(
              withTiming(1, { duration: 120 }),
              withTiming(1.55, { duration: 1380 }),
            ),
            -1,
            false,
          ),
        },
      ],
    };
  });

  return (
    <GlassCard intensity="card" style={styles.card}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const railDone = step.state === "complete";

        return (
          <View key={step.id} style={styles.row}>
            <View style={styles.rail}>
              <Indicator
                step={step}
                pulseNode={
                  <Animated.View style={[styles.pulseRing, pulseStyle]} />
                }
              />
              {isLast ? null : (
                <View
                  style={[styles.line, railDone ? styles.lineDone : styles.linePending]}
                />
              )}
            </View>

            <View style={[styles.body, isLast ? styles.bodyLast : null]}>
              <View
                style={[
                  styles.bodyInner,
                  step.state === "current" ? styles.bodyCurrent : null,
                ]}
              >
                <Text
                  style={[
                    styles.title,
                    step.state === "upcoming" ? styles.titleUpcoming : null,
                    step.state === "current" ? styles.titleCurrent : null,
                  ]}
                >
                  {step.title}
                </Text>
                {step.subtitle ? (
                  <Text style={styles.subtitle}>{step.subtitle}</Text>
                ) : null}

                {step.state === "current" && onContinue ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Continue"
                    onPress={onContinue}
                    style={({ pressed }) => [
                      styles.chip,
                      pressed ? styles.chipPressed : null,
                    ]}
                  >
                    <Text style={styles.chipText}>Continue</Text>
                    <Feather name="arrow-right" size={14} color={colors.white} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.base,
  },
  row: {
    flexDirection: "row",
  },
  rail: {
    width: INDICATOR,
    alignItems: "center",
  },
  indicatorWrap: {
    width: INDICATOR,
    height: INDICATOR,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: INDICATOR,
    height: INDICATOR,
    borderRadius: INDICATOR / 2,
    backgroundColor: colors.primaryBlue,
  },
  indicator: {
    width: INDICATOR,
    height: INDICATOR,
    borderRadius: INDICATOR / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  indicatorComplete: {
    backgroundColor: colors.riskLow,
  },
  indicatorCurrent: {
    backgroundColor: colors.primaryBlue,
  },
  indicatorUpcoming: {
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  line: {
    flex: 1,
    width: 0,
    minHeight: 12,
    marginVertical: 4,
  },
  lineDone: {
    borderLeftWidth: 2,
    borderLeftColor: colors.riskLow,
  },
  // Dashed renders solid on some Android builds; acceptable degradation.
  linePending: {
    borderLeftWidth: 2,
    borderStyle: "dashed",
    borderLeftColor: colors.border,
  },
  body: {
    flex: 1,
    paddingBottom: spacing.base,
    paddingLeft: spacing.mdSm,
  },
  bodyLast: {
    paddingBottom: 0,
  },
  bodyInner: {
    paddingVertical: 4,
  },
  bodyCurrent: {
    backgroundColor: colors.iceBlue,
    borderRadius: 14,
    padding: spacing.mdSm,
    marginTop: -4,
  },
  title: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 15,
    lineHeight: 21,
    color: colors.deepNavy,
  },
  titleCurrent: {
    fontFamily: fontFamily.displaySemi,
    color: colors.deepNavy,
  },
  titleUpcoming: {
    color: colors.mist,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 16,
    color: colors.slate,
  },
  chip: {
    marginTop: spacing.mdSm,
    alignSelf: "flex-start",
    minHeight: 36,
    paddingHorizontal: spacing.base,
    borderRadius: 18,
    backgroundColor: colors.primaryBlue,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipPressed: {
    backgroundColor: "#234FBF",
  },
  chipText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
    color: colors.white,
  },
});
