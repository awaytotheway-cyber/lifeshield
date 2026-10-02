import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { SectionComplete } from "@/components/illustrations";
import { Colors, Radius, Shadow, Space, typeStyle } from "@/lib/theme";

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
    <Animated.View style={[styles.card, Shadow.soft, motionStyle]}>
      <View style={styles.badge}>
        <SectionComplete width={64} height={64} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Space.cardPad,
    alignItems: "center",
  },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.greenTint,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typeStyle("title"),
    marginTop: Space.lg,
    color: Colors.ink,
    textAlign: "center",
  },
  subtitle: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
    textAlign: "center",
  },
});
