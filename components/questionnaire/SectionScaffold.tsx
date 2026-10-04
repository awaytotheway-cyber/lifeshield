import { Redirect, useRouter } from "expo-router";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@/components/specimen/Icon";
import { SafeAreaView } from "react-native-safe-area-context";

import { SectionCompleteCard } from "@/components/questionnaire/SectionCompleteCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import { Colors, Spacing, Typography } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { useTriageStore } from "@/stores/triage-store";

type SectionScaffoldProps = {
  title: string;
  /** Optional one-line intro under the title. */
  subtitle?: string;
  step: number;
  total?: number;
  loading?: boolean;
  hideBack?: boolean;
  children: ReactNode;
  footerTitle?: string;
  onFooterPress?: () => void;
  footerLoading?: boolean;
  footerDisabled?: boolean;
  showComplete?: boolean;
  onCompleteDone?: () => void;
  errorMessage?: string | null;
  /** Shown as a "Skip" affordance in the header when provided. */
  onSkip?: () => void;
};

/**
 * Shared chrome for questionnaire sections — PRESCOPE v2.
 *
 * Deliberately NOT a GradientHero: this is a focused task screen with a
 * white sticky header, a FLUSH edge-to-edge progress bar (no horizontal
 * padding — the editorial detail that keeps it from looking generic),
 * and a sticky gradient Continue button that stays above the keyboard.
 */
export function SectionScaffold({
  title,
  subtitle,
  step,
  total = 10,
  loading = false,
  hideBack = false,
  children,
  footerTitle = COPY.sectionSave,
  onFooterPress,
  footerLoading = false,
  footerDisabled = false,
  showComplete = false,
  onCompleteDone,
  errorMessage,
  onSkip,
}: SectionScaffoldProps) {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const hubHydrated = useQuestionnaireStore((state) => state.hydrated);
  const interruptPendingReproductive = useQuestionnaireStore(
    (state) => state.interruptPendingReproductive,
  );
  const interruptPendingFamily = useQuestionnaireStore(
    (state) => state.interruptPendingFamily,
  );

  if (!session) {
    return <Redirect href={routes.login} />;
  }
  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }
  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  if (!hubHydrated) {
    return (
      <View style={styles.root}>
        <SafeAreaView edges={["top"]} style={styles.flex}>
          <View style={styles.pad}>
            <StaticSkeleton rows={4} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (interruptPendingReproductive && step !== 2) {
    return <Redirect href={routes.qReproductive} />;
  }
  if (interruptPendingFamily && step !== 5) {
    return <Redirect href={routes.qFamilyHistory} />;
  }

  const completeSubtitle = COPY.sectionCompleteSubtitle
    .replace("{current}", String(step))
    .replace("{total}", String(total));

  const Header = (
    <View style={styles.headerWrap}>
      <View style={styles.headerRow}>
        {hideBack ? (
          <View style={styles.headerSide} />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={COPY.hubBack}
            hitSlop={12}
            onPress={() => router.replace(routes.questionnaire)}
            style={styles.headerSide}
          >
            <Feather name="chevron-left" size={24} color={Colors.charcoal} />
          </Pressable>
        )}

        <Text style={styles.headerTitle}>
          Section {step} of {total}
        </Text>

        {onSkip ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={COPY.onboardingSkip}
            hitSlop={12}
            onPress={onSkip}
            style={[styles.headerSide, styles.headerSideRight]}
          >
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        ) : (
          <View style={styles.headerSide} />
        )}
      </View>

      {/* Flush, edge-to-edge progress bar — no horizontal padding. */}
      <ProgressBar
        progress={total > 0 ? step / total : 0}
        height={6}
        rounded={false}
      />
    </View>
  );

  if (showComplete) {
    return (
      <View style={styles.root}>
        <SafeAreaView edges={["top"]} style={styles.flex}>
          {Header}
          <View style={[styles.pad, styles.completeWrap]}>
            <SectionCompleteCard
              subtitle={completeSubtitle}
              onDone={onCompleteDone}
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.flex}>
        {Header}

        {loading ? (
          <View style={styles.pad}>
            <StaticSkeleton rows={5} />
          </View>
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            <View style={styles.body}>{children}</View>
            {/* Breathing room so nobody fat-fingers Continue. */}
            <View style={{ height: 52 }} />
          </ScrollView>
        )}

        {onFooterPress ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.footerWrap}>
              <SafeAreaView edges={["bottom"]}>
                {errorMessage ? (
                  <Text style={styles.error}>{errorMessage}</Text>
                ) : null}
                <PrimaryButton
                  label={footerTitle}
                  onPress={onFooterPress}
                  loading={footerLoading}
                  disabled={footerDisabled}
                  accessibilityLabel={footerTitle}
                />
              </SafeAreaView>
            </View>
          </KeyboardAvoidingView>
        ) : errorMessage ? (
          <View style={styles.footerWrap}>
            <SafeAreaView edges={["bottom"]}>
              <Text style={styles.error}>{errorMessage}</Text>
            </SafeAreaView>
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.softWhite,
  },
  flex: { flex: 1 },
  pad: { paddingHorizontal: Spacing.screenH },

  headerWrap: {
    backgroundColor: Colors.pureWhite,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  headerRow: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
  },
  headerSide: {
    minWidth: 56,
    justifyContent: "center",
  },
  headerSideRight: {
    alignItems: "flex-end",
  },
  headerTitle: {
    fontFamily: Typography.semibold,
    fontSize: Typography.body,
    color: Colors.charcoal,
  },
  skip: {
    fontFamily: Typography.semibold,
    fontSize: 16,
    color: Colors.orangeDark,
  },

  scrollContent: {
    paddingHorizontal: Spacing.screenH,
    paddingBottom: 24,
  },
  title: {
    marginTop: 28,
    fontFamily: Typography.heading,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: Colors.charcoal,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: Typography.regular,
    fontSize: Typography.body,
    lineHeight: 25,
    color: Colors.bodyText,
  },
  body: {
    marginTop: 24,
  },

  footerWrap: {
    backgroundColor: Colors.pureWhite,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  error: {
    fontFamily: Typography.regular,
    fontSize: Typography.secondary,
    lineHeight: 20,
    color: Colors.dangerRed,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  completeWrap: {
    flex: 1,
    justifyContent: "center",
  },
});
