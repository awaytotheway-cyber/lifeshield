import type { ReactNode } from "react";
import { View } from "react-native";

type IllustrationFrameProps = {
  width: number;
  height: number;
  accessibilityLabel: string;
  children: ReactNode;
};

/**
 * Holds screen-reader props on a View.
 * Do not put `accessible` on <Svg> — on web that leaks a boolean onto the DOM.
 */
export function IllustrationFrame({
  width,
  height,
  accessibilityLabel,
  children,
}: IllustrationFrameProps) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{ width, height }}
    >
      {children}
    </View>
  );
}
