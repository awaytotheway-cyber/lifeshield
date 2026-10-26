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
  /** Horizontal padding. The Moss screen gutter is 24. */
  contentPadding?: number;
  /** Stays pinned (questionnaire stepper, back row). */
  header?: ReactNode;
  /** Stays pinned (Save & continue). Keyboard-aware via KeyboardAvoidingView. */
  footer?: ReactNode;
  /** Vertically centre non-scrolling content. Default: only when there is no header/footer. */
  centered?: boolean;
};

/**
 * The Moss screen: a flat `paper` ground and nothing else.
 *
 * There is no gradient here (`heroGradient` belongs to a hero band inside a
 * screen, never to the screen chrome), no blurred atmosphere, no shadow, no
 * elevation and no border. Cards are told apart from the ground by their
 * white fill alone, so the ground must stay completely quiet.
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
          {header ? <View style={[styles.header, pad]}>{header}</View> : null}
          {body}
          {footer ? (
            <SafeAreaView edges={["bottom"]} style={[styles.footer, pad]}>
              {footer}
            </SafeAreaView>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
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
  // Pinned chrome is white on the paper ground, exactly like a card: the fill
  // is the whole separation cue, so there is no border, hairline or shadow
  // between the chrome and the content that scrolls under it.
  header: {
    backgroundColor: colors.white,
  },
  footer: {
    backgroundColor: colors.white,
    paddingTop: 8,
    paddingBottom: 8,
  },
});
