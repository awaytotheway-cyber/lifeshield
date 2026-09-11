import { Redirect, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { QuestionnaireStepper } from "@/components/questionnaire/QuestionnaireStepper";
import { SectionCompleteCard } from "@/components/questionnaire/SectionCompleteCard";
import { IconButton, PrimaryButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import { colors, spacing } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
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

/**
 * Shared chrome for questionnaire sections. Locked users never stay here.
 * Stepper stays at the top; Save & continue stays at the bottom.
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

  const header = (
    <View>
      {hideBack ? null : (
        <IconButton
          icon="arrow-left"
          accessibilityLabel={COPY.hubBack}
          onPress={() => {
            router.replace(routes.questionnaire);
          }}
        />
      )}
      <QuestionnaireStepper current={step} total={total} />
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <Screen contentPadding={spacing.screenX} header={header}>
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
        title={footerTitle}
        onPress={onFooterPress}
        loading={footerLoading}
        disabled={footerDisabled}
        accessibilityLabel={footerTitle}
      />
    </View>
  ) : errorMessage ? (
    <Text style={styles.error}>{errorMessage}</Text>
  ) : null;

  return (
    <Screen scroll contentPadding={spacing.screenX} header={header} footer={footer}>
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: 8,
    marginBottom: 8,
    fontFamily: fontFamily.display,
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.5,
    color: colors.deepTeal,
  },
  error: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.coral,
    textAlign: "center",
    marginBottom: 4,
  },
  completeWrap: {
    flex: 1,
    justifyContent: "center",
  },
});
