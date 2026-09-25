import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, hairline, spacing } from "@/lib/design-tokens";

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  /** Horizontal padding. Design system default is 20. */
  contentPadding?: number;
  /** Stays pinned (questionnaire stepper, back row). */
  header?: ReactNode;
  /** Stays pinned (Save & continue). Keyboard-aware via KeyboardAvoidingView. */
  footer?: ReactNode;
  /** Vertically centre non-scrolling content. Default: only when there is no header/footer. */
  centered?: boolean;
};

/**
 * SwimClub screen shell — flat paper-white canvas, no blur, no gradient.
 * Hierarchy comes from surface contrast and hairline borders inside the
 * content, not from atmosphere behind it. Footer is a hairline-topped
 * white band pinned to the bottom (no shadow, no glass).
 */
export function Screen({
  children,
  scroll = false,
  contentPadding = spacing.screenX,
  header,
  footer,
  centered,
}: ScreenProps) {
  const shouldCenter = centered ?? (!scroll && !header && !footer);
  const pad = { paddingHorizontal: contentPadding };

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.scrollContent,
        pad,
        footer ? styles.scrollWithFooter : null,
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.flex,
        pad,
        styles.paddedY,
        shouldCenter ? styles.center : null,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {header ? <View style={pad}>{header}</View> : null}
          {body}
          {footer ? (
            <View style={styles.footerBar}>
              <SafeAreaView edges={["bottom"]} style={[styles.footer, pad]}>
                {footer}
              </SafeAreaView>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paperWhite,
  },
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.base,
    paddingBottom: spacing.lg,
  },
  scrollWithFooter: {
    paddingBottom: spacing.base,
  },
  paddedY: {
    paddingVertical: spacing.lg,
  },
  center: {
    justifyContent: "center",
  },
  footerBar: {
    backgroundColor: colors.paperWhite,
    borderTopWidth: hairline,
    borderTopColor: colors.inkBlack,
  },
  footer: {
    backgroundColor: "transparent",
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
});
