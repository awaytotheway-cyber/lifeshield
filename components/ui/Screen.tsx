import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ink, Measure, Paper, Rule } from "@/lib/specimen-tokens";


type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  /** Horizontal padding. SPECIMEN gutter is 22. */
  contentPadding?: number;
  /** Stays pinned (questionnaire stepper, back row). */
  header?: ReactNode;
  /** Stays pinned (Save & continue). Keyboard-aware. */
  footer?: ReactNode;
  /** Vertically centre non-scrolling content. */
  centered?: boolean;
};

/**
 * The page — SPECIMEN.
 *
 * Flat laboratory paper:
 * in this system depth comes from hairline rules and generous space,
 * never from atmosphere behind a panel.
 */
export function Screen({
  children,
  scroll = false,
  contentPadding = Measure.gutter,
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
          {header ? <View style={[pad, styles.header]}>{header}</View> : null}
          {body}
          {footer ? (
            <View style={styles.footerWrap}>
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
    backgroundColor: Paper.sheet,
  },
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingTop: Measure.tight,
  },
  scrollContent: {
    paddingTop: Measure.base,
    paddingBottom: Measure.plate,
  },
  scrollWithFooter: {
    paddingBottom: Measure.loose,
  },
  paddedY: {
    paddingVertical: Measure.section,
  },
  center: {
    justifyContent: "center",
  },
  footerWrap: {
    backgroundColor: Paper.sheet,
    borderTopWidth: Rule.hair,
    borderTopColor: Ink.ruleStrong,
  },
  footer: {
    backgroundColor: "transparent",
    paddingTop: Measure.snug,
    paddingBottom: Measure.tight,
  },
});
