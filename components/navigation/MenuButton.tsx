import { Pressable, StyleSheet } from "react-native";
import { Icon } from "@/components/specimen/Icon";

import { useDrawer } from "@/components/navigation/DrawerContext";
import { Accent, tapTarget } from "@/lib/specimen-tokens";

type MenuButtonProps = {
  accessibilityLabel?: string;
};

/** Opens the side drawer — 44px hit target. */
export function MenuButton({
  accessibilityLabel = "Open menu",
}: MenuButtonProps) {
  const { openDrawer } = useDrawer();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={openDrawer}
      style={styles.hit}
    >
      <Icon name="menu" size={22} color={Accent.tag} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: tapTarget,
    height: tapTarget,
    alignItems: "center",
    justifyContent: "center",
  },
});
