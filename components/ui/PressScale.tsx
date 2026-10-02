import {
  Pressable,
  type AccessibilityRole,
  type AccessibilityState,
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

type AriaProps = {
  "aria-checked"?: boolean;
  "aria-expanded"?: boolean;
  "aria-pressed"?: boolean;
  "aria-selected"?: boolean;
};

/**
 * react-native-web 0.21 no longer turns `accessibilityState` into `aria-*`
 * attributes, so a tapped choice would announce itself as unchecked. We keep
 * `accessibilityState` for native and emit the matching `aria-*` prop here.
 *
 * Which attribute is correct depends on the role: radios, checkboxes and
 * switches take `aria-checked`, a toggling button takes `aria-pressed`, and
 * only list/tab style roles take `aria-selected`.
 */
function ariaFromState(
  state: AccessibilityState | undefined,
  role: AccessibilityRole | undefined,
): AriaProps {
  if (!state) {
    return {};
  }

  const aria: AriaProps = {};

  if (state.expanded !== undefined) {
    aria["aria-expanded"] = state.expanded;
  }

  const on = state.checked === true || state.selected === true;
  const hasToggle = state.checked !== undefined || state.selected !== undefined;
  if (!hasToggle || state.checked === "mixed") {
    return aria;
  }

  if (role === "radio" || role === "checkbox" || role === "switch") {
    aria["aria-checked"] = on;
  } else if (role === "tab" || role === "menuitem") {
    aria["aria-selected"] = on;
  } else {
    aria["aria-pressed"] = on;
  }

  return aria;
}

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
      {...ariaFromState(rest.accessibilityState, rest.accessibilityRole)}
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
