import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Radii, Spacing } from "@/lib/design-tokens";

type GradientHeroProps = {
  children?: ReactNode;
  /** Default 220. */
  height?: number;
  /** Default Radii.hero (28). */
  bottomRadius?: number;
  /** Horizontal padding inside the hero. Default Spacing.screenH. */
  paddingH?: number;
  /** Renders a glass back chevron in the top-left when provided. */
  onBack?: () => void;
  /** Accessibility label for the back control. */
  backLabel?: string;
};

/**
 * The signature PRESCOPE hero — top of most main screens. Full-bleed
 * 3-stop orange gradient, flush top corners, 28px bottom corners.
 *
 * Never add shadows to the hero itself; the dropshadow bleeds oddly on
 * iOS at full width. Place content (stats, hero numbers) inside.
 */
export function GradientHero({
  children,
  height = 220,
  bottomRadius = Radii.hero,
  paddingH = Spacing.screenH,
  onBack,
  backLabel = "Go back",
}: GradientHeroProps) {
  const insets = useSafeAreaInsets();

  const back = () => {
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync().catch(() => {});
    }
    onBack?.();
  };

  return (
    <View
      style={[
        styles.outer,
        {
          height: height + insets.top,
          borderBottomLeftRadius: bottomRadius,
          borderBottomRightRadius: bottomRadius,
        },
      ]}
    >
      <LinearGradient
        colors={[...Colors.gradientOrange]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView edges={["top"]} style={styles.inner}>
        <View style={[styles.content, { paddingHorizontal: paddingH }]}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={backLabel}
              onPress={back}
              hitSlop={10}
              style={({ pressed }) => [
                styles.backBtn,
                pressed ? { opacity: 0.75 } : null,
              ]}
            >
              <Feather name="chevron-left" size={22} color={Colors.pureWhite} />
            </Pressable>
          ) : null}
          {children}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    overflow: "hidden",
  },
  inner: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.20)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
  },
});
