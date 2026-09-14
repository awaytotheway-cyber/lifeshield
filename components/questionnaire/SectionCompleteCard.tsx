import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { SectionComplete } from "@/components/illustrations";
import { colors, radius, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type SectionCompleteCardProps = {
  title?: string;
  subtitle: string;
  onDone?: () => void;
};

/**
 * Short “well done” moment after a section saves. Auto-hides after 1.5 seconds.
 */
export function SectionCompleteCard({
  title = "Section complete",
  subtitle,
  onDone,
}: SectionCompleteCardProps) {
  const reduceMotion = useReducedMotion();
  const appear = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    appear.value = reduceMotion ? 1 : withTiming(1, { duration: 200 });
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    const hold = setTimeout(() => {
      if (!reduceMotion) {
        appear.value = withTiming(0, { duration: 200 });
      }
      fadeTimer = setTimeout(() => onDone?.(), reduceMotion ? 0 : 200);
    }, 1500);
    return () => {
      clearTimeout(hold);
      if (fadeTimer) {
        clearTimeout(fadeTimer);
      }
    };
  }, [appear, onDone, reduceMotion]);

  const motionStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ scale: reduceMotion ? 1 : 0.95 + appear.value * 0.05 }],
  }));

  return (
    <Animated.View style={[styles.card, motionStyle]}>
      <SectionComplete width={80} height={80} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.sageLight,
    borderRadius: radius.card,
    padding: spacing.md,
    alignItems: "center",
  },
  title: {
    marginTop: 12,
    fontFamily: fontFamily.display,
    fontSize: 20,
    color: colors.sage,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.charcoal,
    textAlign: "center",
  },
});
