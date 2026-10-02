import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Gap, Shadow, Space } from "@/lib/theme";

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  /** Horizontal padding. The redesign default is 24 on every screen. */
  contentPadding?: number;
  /** Stays pinned (questionnaire stepper, back row). */
  header?: ReactNode;
  /** Stays pinned (Save & continue). Keyboard-aware via KeyboardAvoidingView. */
  footer?: ReactNode;
  /** Vertically centre non-scrolling content. Default: only when there is no header/footer. */
  centered?: boolean;
  /**
   * Set false when the screen starts with a full-bleed <Hero />, which supplies
   * its own top safe-area inset and must run edge to edge.
   */
  edgeToEdge?: boolean;
};

/**
 * Every screen's outer shell: warm #FDFAF8 background, 24px horizontal
 * padding, safe areas handled, keyboard-aware.
 *
 * PLAIN ENGLISH: wrap a screen in this and it automatically gets the right
 * background colour and the generous side padding the redesign asks for.
 * Use `scroll` for long screens, `footer` for a sticky bottom button, and
 * `edgeToEdge` when the first thing on the screen is a <Hero />.
 */
export function Screen({
  children,
  scroll = false,
  contentPadding = Space.screenH,
  header,
  footer,
  centered,
  edgeToEdge = false,
}: ScreenProps) {
  const shouldCenter = centered ?? (!scroll && !header && !footer);
  const pad = { paddingHorizontal: edgeToEdge ? 0 : contentPadding };

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
        edgeToEdge ? null : styles.paddedY,
        shouldCenter ? styles.center : null,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View style={styles.root}>
      <SafeAreaView
        style={styles.safe}
        edges={edgeToEdge ? ["left", "right"] : ["top", "left", "right"]}
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {header ? (
            <View style={{ paddingHorizontal: contentPadding }}>{header}</View>
          ) : null}
          {body}
          {footer ? (
            <View style={[styles.footerChrome, Shadow.lift]}>
              <SafeAreaView
                edges={["bottom"]}
                style={[styles.footer, { paddingHorizontal: contentPadding }]}
              >
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
    backgroundColor: Colors.background,
  },
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Space.lg,
    // Section 10: generous bottom padding so content never hugs the edge.
    paddingBottom: Gap.screenBottom,
  },
  scrollWithFooter: {
    paddingBottom: Gap.beforeFooter,
  },
  paddedY: {
    paddingVertical: Space.xl,
  },
  center: {
    justifyContent: "center",
  },
  footerChrome: {
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.line,
  },
  footer: {
    backgroundColor: "transparent",
    paddingTop: Space.md,
    paddingBottom: Space.md,
  },
});
