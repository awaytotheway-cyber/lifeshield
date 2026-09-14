import { Pressable, StyleSheet, Text, View } from "react-native";
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
};

type JourneyProgressCardProps = {
  steps: JourneyStepItem[];
  onContinue?: () => void;
};

/**
 * Home-style vertical timeline. Built now so later screens can drop it in.
 */
export function JourneyProgressCard({ steps, onContinue }: JourneyProgressCardProps) {
  const reduceMotion = useReducedMotion();
  const pulse = useAnimatedStyle(() => {
    if (reduceMotion) {
      return { opacity: 1 };
    }
    return {
      opacity: withRepeat(
        withSequence(withTiming(1, { duration: 700 }), withTiming(0.45, { duration: 700 })),
        -1,
        true,
      ),
    };
  });

  return (
    <GlassCard intensity="card" style={styles.card}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const color =
          step.state === "complete"
            ? colors.riskLow
            : step.state === "current"
              ? colors.primaryBlue
              : colors.border;
        const textColor =
          step.state === "upcoming" ? colors.mist : colors.deepNavy;
        const weight = step.state === "current" ? fontFamily.bodySemi : fontFamily.body;

        return (
          <View key={step.id} style={styles.row}>
            <View style={styles.rail}>
              {step.state === "current" ? (
                <Animated.View style={[styles.dot, { backgroundColor: color }, pulse]} />
              ) : (
                <View style={[styles.dot, { backgroundColor: color }]} />
              )}
              {isLast ? null : <View style={styles.line} />}
            </View>
            <View style={styles.body}>
              <Text style={[styles.title, { color: textColor, fontFamily: weight }]}>
                {step.title}
              </Text>
              {step.state === "current" && onContinue ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue"
                  onPress={onContinue}
                  style={styles.chip}
                >
                  <Text style={styles.chipText}>Continue</Text>
                  <Feather name="chevron-right" size={14} color={colors.primaryBlue} />
                </Pressable>
              ) : null}
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
    minHeight: 44,
  },
  rail: {
    width: 24,
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  body: {
    flex: 1,
    paddingBottom: 16,
    paddingLeft: 8,
  },
  title: {
    fontSize: 15,
    lineHeight: 24,
  },
  chip: {
    marginTop: 8,
    alignSelf: "flex-start",
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.lightTeal,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chipText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.primaryBlue,
  },
});
