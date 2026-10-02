import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { BackButton } from "@/components/ui/BackButton";
import { Colors, Motion, Size, Space, typeStyle } from "@/lib/theme";

type QuestionnaireStepperProps = {
  current: number;
  total: number;
  /** Where the back button goes. Omit to use the default router behaviour. */
  onBack?: () => void;
  backLabel?: string;
  /** Hide the back button (the first section opened from the hub still shows it). */
  hideBack?: boolean;
};

/**
 * The slim sticky header above a questionnaire section (Section 8 of the
 * redesign brief): back button on the left, “Section 3 of 10” centred, and a
 * progress bar flush to both screen edges underneath.
 *
 * PLAIN ENGLISH: the thin strip at the top of every questionnaire page that
 * tells you where you are and lets you go back to the list.
 */
export function QuestionnaireStepper({
  current,
  total,
  onBack,
  backLabel,
  hideBack = false,
}: QuestionnaireStepperProps) {
  const reduceMotion = useReducedMotion();
  const ratio = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0;
  const progress = useSharedValue(ratio);

  useEffect(() => {
    progress.value = reduceMotion
      ? ratio
      : withTiming(ratio, { duration: Motion.screen });
  }, [progress, ratio, reduceMotion]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {hideBack ? (
          <View style={styles.spacer} />
        ) : (
          <BackButton onPress={onBack} accessibilityLabel={backLabel} />
        )}
        <Text style={styles.label} accessibilityRole="header">
          Section {current} of {total}
        </Text>
        <View style={styles.spacer} />
      </View>
      {/* Negative margins pull the bar out past the screen's 24px padding. */}
      <View style={styles.bleed}>
        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityLabel={`Section ${current} of ${total}`}
        >
          <Animated.View style={[styles.fill, fillStyle]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: Space.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: Size.circleButton,
    marginBottom: Space.md,
  },
  spacer: {
    width: Size.circleButton,
    height: Size.circleButton,
  },
  label: {
    flex: 1,
    ...typeStyle("label", Colors.muted),
    textAlign: "center",
  },
  bleed: {
    marginHorizontal: -Space.screenH,
  },
  track: {
    height: 4,
    width: "100%",
    backgroundColor: Colors.line,
    overflow: "hidden",
  },
  fill: {
    height: 4,
    backgroundColor: Colors.orange,
  },
});
