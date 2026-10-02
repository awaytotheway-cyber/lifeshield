import { StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useDrawer } from "@/components/navigation/DrawerContext";
import { PressScale } from "@/components/ui/PressScale";
import { Colors, Shadow, Size } from "@/lib/theme";

type MenuButtonProps = {
  accessibilityLabel?: string;
};

/**
 * 48px circular white button with a soft warm shadow that opens the menu
 * drawer. Lives top-right on Home.
 */
export function MenuButton({
  accessibilityLabel = "Open menu",
}: MenuButtonProps) {
  const { openDrawer } = useDrawer();
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={openDrawer}
      haptic="light"
      style={[styles.circle, Shadow.soft]}
    >
      <Feather name="menu" size={24} color={Colors.ink} />
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
