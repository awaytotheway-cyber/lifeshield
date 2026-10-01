import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
}: GradientHeroProps) {
  const insets = useSafeAreaInsets();
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
});
