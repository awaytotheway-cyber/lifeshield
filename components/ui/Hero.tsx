import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Gradients, Radius, Space, typeStyle } from "@/lib/theme";

type HeroProps = {
  /** Serif headline. */
  title?: string;
  /** Small warm grey line above the title (e.g. "Good morning"). */
  eyebrow?: string;
  /** One supporting line below the title. */
  subtitle?: string;
  /** Right-hand control — usually a MenuButton or a Chip. */
  action?: ReactNode;
  /** Anything else inside the wash, below the title block. */
  children?: ReactNode;
  /** Include the top safe-area inset. True when the hero is the first thing on screen. */
  safeTop?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Top-of-screen warm gradient wash with a 32px bottom radius.
 *
 * PLAIN ENGLISH: the soft orange-to-cream band at the top of a screen.
 * Put the screen title inside it; anything below gets the plain warm
 * background. Add 32px of space before the first content underneath.
 */
export function Hero({
  title,
  eyebrow,
  subtitle,
  action,
  children,
  safeTop = true,
  style,
}: HeroProps) {
  const inner = (
    <View style={styles.inner}>
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          {title ? (
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
          ) : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
      {children}
    </View>
  );

  return (
    <LinearGradient
      colors={[...Gradients.heroWarm]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.wash, style]}
    >
      {safeTop ? (
        <SafeAreaView edges={["top"]} style={styles.safe}>
          {inner}
        </SafeAreaView>
      ) : (
        inner
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wash: {
    borderBottomLeftRadius: Radius.hero,
    borderBottomRightRadius: Radius.hero,
  },
  safe: {
    backgroundColor: "transparent",
  },
  inner: {
    paddingHorizontal: Space.screenH,
    paddingTop: Space.xl,
    paddingBottom: Space.xl,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Space.md,
  },
  titleBlock: {
    flex: 1,
  },
  eyebrow: {
    ...typeStyle("secondary"),
    color: Colors.muted,
  },
  title: {
    ...typeStyle("hero"),
    marginTop: 2,
    color: Colors.ink,
  },
  subtitle: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
  },
  action: {
    paddingTop: 2,
  },
});
