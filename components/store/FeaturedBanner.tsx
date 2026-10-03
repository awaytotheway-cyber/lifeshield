import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Colors, Radii, Shadows, Spacing, Typography } from "@/lib/design-tokens";

type FeaturedBannerProps = {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onPress?: () => void;
};

/**
 * Standalone gradient card for the store's featured collection.
 *
 * Not a GradientHero — that component is reserved for screen tops. This
 * is a 160px card with all four corners rounded, sitting inside the
 * normal content flow.
 */
export function FeaturedBanner({
  title,
  subtitle,
  ctaLabel,
  onPress,
}: FeaturedBannerProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={title}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.wrap,
        Shadows.floatingCard,
        pressed && onPress ? { opacity: 0.94 } : null,
      ]}
    >
      <LinearGradient
        colors={[...Colors.gradientOrange]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Decorative product circles on the right. */}
      <View style={styles.circles} pointerEvents="none">
        <View style={[styles.circle, styles.circleBack]} />
        <View style={[styles.circle, styles.circleMid]} />
        <View style={[styles.circle, styles.circleFront]} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {ctaLabel ? (
          <View style={styles.cta}>
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 160,
    borderRadius: Radii.cardLarge,
    overflow: "hidden",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: Spacing.lg,
    maxWidth: "68%",
  },
  title: {
    fontFamily: Typography.heading,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: Colors.pureWhite,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: Typography.regular,
    fontSize: Typography.secondary,
    lineHeight: 19,
    color: "rgba(255,255,255,0.80)",
  },
  cta: {
    marginTop: Spacing.md,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radii.chip,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  ctaText: {
    fontFamily: Typography.semibold,
    fontSize: Typography.label,
    color: Colors.pureWhite,
  },
  circles: {
    position: "absolute",
    right: -10,
    top: 0,
    bottom: 0,
    width: 150,
    justifyContent: "center",
  },
  circle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  circleBack: {
    width: 120,
    height: 120,
    right: 10,
  },
  circleMid: {
    width: 76,
    height: 76,
    right: 76,
    top: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  circleFront: {
    width: 54,
    height: 54,
    right: 34,
    bottom: 16,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
});
