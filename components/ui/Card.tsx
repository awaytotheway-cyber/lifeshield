import type { ReactNode } from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { PressScale } from "@/components/ui/PressScale";
import { Colors, Motion, Radius, Shadow, Space } from "@/lib/theme";

type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Set false when the card hosts its own edge-to-edge content (e.g. a list). */
  padded?: boolean;
  /** Makes the whole card tappable with a gentle 0.98 press. */
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Use the stronger shadow for cards that float over a hero. */
  elevated?: boolean;
};

/**
 * The workhorse surface: white, 24px radius, 24px padding, soft warm shadow.
 *
 * PLAIN ENGLISH: almost all content on every screen sits inside one of these.
 * Stack them with 16px gaps.
 */
export function Card({
  children,
  style,
  padded = true,
  onPress,
  accessibilityLabel,
  elevated = false,
}: CardProps) {
  const shape = [
    styles.card,
    padded ? styles.padded : null,
    elevated ? Shadow.lift : Shadow.soft,
    style,
  ];

  if (onPress) {
    return (
      <PressScale
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        scale={Motion.pressCard}
        haptic="light"
        style={shape}
      >
        {children}
      </PressScale>
    );
  }

  return <View style={shape}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
  },
  padded: {
    padding: Space.cardPad,
  },
});
