import {
  Pressable,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { hapticLight, hapticMedium } from "@/lib/haptics";
import { Motion } from "@/lib/theme";

type PressScaleProps = Omit<PressableProps, "style"> & {
  style?:
    | StyleProp<ViewStyle>
    | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
  /** How far to shrink on press. Buttons use 0.97, cards 0.98. */
  scale?: number;
  /** Fire a haptic tap on press. "medium" for primary actions, "light" for choices. */
  haptic?: "none" | "light" | "medium";
};

/**
 * Tiny press shrink. Turns off when the phone asks for less motion.
 *
 * PLAIN ENGLISH: wraps anything tappable so it gently shrinks while held and
 * (optionally) buzzes. Haptics are safe on web — they just do nothing.
 */
export function PressScale({
  children,
  style,
  scale = Motion.pressButton,
  haptic = "none",
  onPressIn,
  onPressOut,
  ...rest
}: PressScaleProps) {
  const reduceMotion = useReducedMotion();

  return (
    <Pressable
      {...rest}
      style={(state) => {
        const resolved = typeof style === "function" ? style(state) : style;
        const pressedScale = !reduceMotion && state.pressed ? scale : 1;
        return [resolved, { transform: [{ scale: pressedScale }] }];
      }}
      onPressIn={(event) => {
        if (haptic === "medium") {
          hapticMedium();
        } else if (haptic === "light") {
          hapticLight();
        }
        onPressIn?.(event);
      }}
      onPressOut={onPressOut}
    >
      {children}
    </Pressable>
  );
}
