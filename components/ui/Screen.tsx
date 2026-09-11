import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {header ? <View style={pad}>{header}</View> : null}
        {body}
        {footer ? (
          <SafeAreaView edges={["bottom"]} style={[styles.footer, pad]}>
            {footer}
          </SafeAreaView>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 32,
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
  footer: {
    backgroundColor: colors.cream,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
