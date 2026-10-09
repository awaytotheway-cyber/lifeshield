import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { GlassCard } from "@/components/ui/GlassCard";
import { colors, gradients, spacing } from "@/lib/design-tokens";

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

/** Soft blurred blobs so glass cards never sit on flat white. */
function Atmosphere() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[...gradients.screen]}
        locations={[...gradients.screenLocations]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.blob, styles.blobTL]} />
      <View style={[styles.blob, styles.blobBR]} />
      <View style={[styles.blob, styles.blobMid]} />
    </View>
  );
}

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
      <Atmosphere />
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
    backgroundColor: colors.iceBlue,
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
  footerGlass: {
    overflow: "hidden",
  },
  footer: {
    backgroundColor: "transparent",
    paddingTop: 8,
    paddingBottom: 8,
  },
  blob: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.45,
  },
  blobTL: {
    width: 220,
    height: 220,
    top: -60,
    left: -40,
    backgroundColor: colors.skyBlue,
  },
  blobBR: {
    width: 260,
    height: 260,
    bottom: -80,
    right: -60,
    backgroundColor: colors.primaryBlue,
    opacity: 0.18,
  },
  blobMid: {
    width: 160,
    height: 160,
    top: 280,
    right: -30,
    backgroundColor: "#A8C4F8",
    opacity: 0.35,
  },
});
