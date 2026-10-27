import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { MossPattern } from "@/components/ui/MossPattern";
import { colors, radius, spacing } from "@/lib/design-tokens";
import { typography } from "@/lib/typography";

type SectionCompleteCardProps = {
  title?: string;
  subtitle: string;
  onDone?: () => void;
};

/**
 * Short “well done” moment after a section saves. Auto-hides after 1.5 seconds.
 *
 * A band of the motif rather than a drawn tick: the card already says
 * "Section complete", so a picture of completion would only say it twice. The
 * band runs to the card's edges, where the surface radius clips it — the same
 * band-then-copy shape as `EmptyState`.
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

  // Not a `Surface`: the card is animated, so it needs an `Animated.View` of
  // its own. The fill and the radius are the surface's, to the point.
  return (
    <Animated.View style={[styles.card, motionStyle]}>
      <MossPattern height={96} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.surface,
    // The band runs edge to edge, so the copy carries the inset instead.
    paddingBottom: spacing.md,
    overflow: "hidden",
  },
  title: {
    marginTop: spacing.base,
    marginHorizontal: 20,
    ...typography.title,
    color: colors.ink,
    textAlign: "center",
  },
  subtitle: {
    marginTop: spacing.sm,
    marginHorizontal: 20,
    ...typography.body,
    color: colors.inkSoft,
    textAlign: "center",
  },
});
