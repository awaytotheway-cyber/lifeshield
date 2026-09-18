import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type QuestionnaireStepperProps = {
  current: number;
  total: number;
};

/**
 * Top bar for a questionnaire section: “Section 3 of 10” plus a thin sage bar.
 */
export function QuestionnaireStepper({ current, total }: QuestionnaireStepperProps) {
  const reduceMotion = useReducedMotion();
  const ratio = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0;
  const progress = useSharedValue(ratio);

  useEffect(() => {
    progress.value = reduceMotion ? ratio : withTiming(ratio, { duration: 400 });
  }, [progress, ratio, reduceMotion]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.bar}>
      <Text style={styles.label}>
        Section {current} of {total}
      </Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.white,
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 12,
  },
  label: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.inkOnLightMuted,
    marginBottom: 8,
  },
  track: {
    height: 4,
    width: "100%",
    backgroundColor: colors.borderOnLight,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: 4,
    backgroundColor: colors.sage,
    borderRadius: 2,
  },
});
