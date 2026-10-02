import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { PressScale } from "@/components/ui/PressScale";
import { Colors, Shadow, Size } from "@/lib/theme";

type BackButtonProps = {
  /** Defaults to router.back() with a safe fallback if there is nothing to pop. */
  onPress?: () => void;
  accessibilityLabel?: string;
};

/**
 * 48px circular white back button with a soft warm shadow.
 * Every sub-screen gets one, top-left.
 */
export function BackButton({
  onPress,
  accessibilityLabel = "Go back",
}: BackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        // Nothing to pop (deep link / refresh) — never leave a dead button.
        router.replace("/(main)/home");
      }
    } catch {
      // Navigation should never crash the screen.
    }
  };

  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={handlePress}
      haptic="light"
      style={[styles.circle, Shadow.soft]}
    >
      <Feather name="arrow-left" size={22} color={Colors.ink} />
    </PressScale>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: Size.circleButton,
    height: Size.circleButton,
    borderRadius: Size.circleButton / 2,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
});
