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

import { Surface } from "@/components/ui/Surface";
import { colors, radius, spacing, tapTarget } from "@/lib/design-tokens";
import { fontFamily, typography } from "@/lib/typography";

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

/**
 * Pressed ink, the same value `Button` uses — darkened just enough to
 * register the press without reading as a second colour.
 */
const INK_PRESSED = "#2A2A26";

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
      <Feather name="lock" size={13} color={colors.inkFaint} />
    </View>
  );
}

/**
 * Vertical journey timeline. Completed steps carry a solid moss rail down to
 * the next step; anything not yet reached uses a dashed hairline. The current
 * step sits on a `mossTint` block with its own Continue action.
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
    <Surface padded={false} style={styles.card}>
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
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    // The Moss card inset is 20; this card sets it by hand because the rows
    // inside it own their own vertical rhythm.
    padding: 20,
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
    borderRadius: radius.pill,
    backgroundColor: colors.mossMid,
  },
  indicator: {
    width: INDICATOR,
    height: INDICATOR,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  indicatorComplete: {
    backgroundColor: colors.mossDeep,
  },
  indicatorCurrent: {
    backgroundColor: colors.ink,
  },
  indicatorUpcoming: {
    borderWidth: 1,
    borderColor: colors.hairline,
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
    borderLeftColor: colors.mossDeep,
  },
  // Dashed renders solid on some Android builds; acceptable degradation.
  linePending: {
    borderLeftWidth: 2,
    borderStyle: "dashed",
    borderLeftColor: colors.hairline,
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
    backgroundColor: colors.mossTint,
    borderRadius: radius.control,
    padding: spacing.mdSm,
    marginTop: -4,
  },
  title: {
    ...typography.body,
    color: colors.ink,
  },
  titleCurrent: {
    ...typography.title,
    color: colors.ink,
  },
  // inkFaint is a headline colour at 24px and up only — at this title’s
  // 20px it is 3.47:1 on white, under the 4.5:1 AA floor for normal text.
  titleUpcoming: {
    color: colors.inkSoft,
  },
  subtitle: {
    marginTop: 2,
    ...typography.label,
    color: colors.inkSoft,
  },
  // The step’s own action. Ink, like every primary — so a screen showing
  // this card must not also carry a second black button.
  chip: {
    marginTop: spacing.mdSm,
    alignSelf: "flex-start",
    minHeight: tapTarget,
    paddingHorizontal: spacing.base,
    borderRadius: radius.control,
    backgroundColor: colors.ink,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipPressed: {
    backgroundColor: INK_PRESSED,
  },
  // A button label, so it takes the button's metric — 15 at 600 — rather
  // than the 13 of the field labels around it.
  chipText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    color: colors.white,
  },
});
