import {
  Pressable,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useReducedMotion } from "react-native-reanimated";

type PressScaleProps = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
};

/**
 * Tiny press shrink (scale 0.97). Turns off when the phone asks for less motion.
 */
export function PressScale({ children, style, onPressIn, onPressOut, ...rest }: PressScaleProps) {
  const reduceMotion = useReducedMotion();

  return (
    <Pressable
      {...rest}
      style={(state) => {
        const resolved = typeof style === "function" ? style(state) : style;
        const scale = !reduceMotion && state.pressed ? 0.97 : 1;
        return [resolved, { transform: [{ scale }] }];
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      {children}
    </Pressable>
  );
}
