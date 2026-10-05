import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GlassCard } from "@/components/ui/GlassCard";
import { colors, spacing } from "@/lib/design-tokens";

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
      showsVerticalScrollIndicator={false}
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
            <GlassCard intensity="chrome" style={styles.footerGlass}>
              <SafeAreaView edges={["bottom"]} style={[styles.footer, pad]}>
                {footer}
              </SafeAreaView>
            </GlassCard>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.appBackground,
  },
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 96,
  },
  scrollWithFooter: {
    paddingBottom: 16,
  },
  paddedY: {
    paddingVertical: 32,
  },
  center: {
    justifyContent: "center",
  },
  footerGlass: {
    overflow: "hidden",
  },
  footer: {
    backgroundColor: "transparent",
    paddingTop: 8,
    paddingBottom: 8,
  },
});
