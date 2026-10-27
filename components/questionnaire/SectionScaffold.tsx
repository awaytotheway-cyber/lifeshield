import { Redirect, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { QuestionnaireStepper } from "@/components/questionnaire/QuestionnaireStepper";
import { SectionCompleteCard } from "@/components/questionnaire/SectionCompleteCard";
import { PrimaryButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import { colors, spacing, status } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { useTriageStore } from "@/stores/triage-store";

type SectionScaffoldProps = {
  title: string;
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
};

/** Failure text borrows the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

/**
 * What the one button says while it cannot be pressed. A disabled button that
 * still says "Save & continue" reads as broken; this one says what is missing.
 */
const ANSWER_TO_CONTINUE = "Answer to continue";

/**
 * Shared chrome for questionnaire sections. Locked users never stay here.
 *
 * The stepper and the section's name stay pinned at the top, the one ink
 * button stays at the bottom, and everything between them scrolls. There is
 * no second button down there: the way back is the arrow in the stepper, so
 * the screen keeps exactly one black button.
 */
export function SectionScaffold({
  title,
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
      <Screen contentPadding={spacing.screenX}>
        <StaticSkeleton rows={4} />
      </Screen>
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

  // Only the stepper is pinned. The section's name scrolls with the questions
  // it belongs to, so a three-line title does not eat a third of the screen
  // for the whole section.
  const header = (
    <QuestionnaireStepper
      current={step}
      total={total}
      onBack={
        hideBack
          ? undefined
          : () => {
              router.replace(routes.questionnaire);
            }
      }
    />
  );

  const heading = (
    <Text style={styles.title} accessibilityRole="header">
      {title}
    </Text>
  );

  if (loading) {
    return (
      <Screen contentPadding={spacing.screenX} header={header}>
        {heading}
        <StaticSkeleton rows={5} />
      </Screen>
    );
  }

  if (showComplete) {
    return (
      <Screen contentPadding={spacing.screenX} header={header}>
        <View style={styles.completeWrap}>
          <SectionCompleteCard
            subtitle={completeSubtitle}
            onDone={onCompleteDone}
          />
        </View>
      </Screen>
    );
  }

  const footer = onFooterPress ? (
    <View>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <PrimaryButton
        // Disabled and not mid-save: say what is missing. While it is saving
        // the button shows its spinner, so the title is not read then.
        title={
          footerDisabled && !footerLoading ? ANSWER_TO_CONTINUE : footerTitle
        }
        onPress={onFooterPress}
        loading={footerLoading}
        disabled={footerDisabled}
        accessibilityLabel={
          footerDisabled && !footerLoading ? ANSWER_TO_CONTINUE : footerTitle
        }
      />
    </View>
  ) : errorMessage ? (
    <Text style={styles.error}>{errorMessage}</Text>
  ) : null;

  return (
    <Screen scroll contentPadding={spacing.screenX} header={header} footer={footer}>
      {heading}
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 8,
    ...typography.displayL,
    color: colors.ink,
  },
  error: {
    marginBottom: 4,
    ...typography.label,
    color: CLAY,
    textAlign: "center",
  },
  completeWrap: {
    flex: 1,
    justifyContent: "center",
  },
});
