import { Redirect, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { QuestionnaireStepper } from "@/components/questionnaire/QuestionnaireStepper";
import { SectionCompleteCard } from "@/components/questionnaire/SectionCompleteCard";
import { PrimaryButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { useTriageStore } from "@/stores/triage-store";

type SectionScaffoldProps = {
  title: string;
  /** One line of body copy under the serif title. */
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
};

/**
 * Shared chrome for questionnaire sections. Locked users never stay here.
 * Stepper stays at the top; Save & continue stays at the bottom.
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
      <Screen>
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
    <QuestionnaireStepper
      current={step}
      total={total}
      hideBack={hideBack}
      backLabel={COPY.hubBack}
      onBack={() => {
        router.replace(routes.questionnaire);
      }}
    />
  );

  if (loading) {
    return (
      <Screen header={header}>
        <StaticSkeleton rows={5} />
      </Screen>
    );
  }

  if (showComplete) {
    return (
      <Screen header={header}>
        <View style={styles.completeWrap}>
          <SectionCompleteCard
            subtitle={completeSubtitle}
            onDone={onCompleteDone}
          />
        </View>
      </Screen>
    );
  }

  // Section 8: 24px of padding around the sticky footer button. The Screen
  // shell supplies 18px, so 6px more on each side lands on 24.
  const footer = onFooterPress ? (
    <View style={styles.footer}>
      {errorMessage ? (
        <Text style={styles.footerError}>{errorMessage}</Text>
      ) : null}
      <PrimaryButton
        title={footerTitle}
        onPress={onFooterPress}
        loading={footerLoading}
        disabled={footerDisabled}
        accessibilityLabel={footerTitle}
        style={styles.footerButton}
      />
    </View>
  ) : errorMessage ? (
    <View style={styles.footer}>
      <Text style={styles.footerError}>{errorMessage}</Text>
    </View>
  ) : null;

  return (
    <Screen scroll header={header} footer={footer}>
      <View style={styles.titleBlock}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {children}
      {/* Section 8: 56px of air before the sticky footer (40 from the
          Screen shell + 16 here). */}
      <View style={styles.tailSpace} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleBlock: {
    // The Screen shell already adds 24px; 8px more makes the mandated 32px
    // of air between the header and the first content.
    marginTop: Space.sm - 4,
  },
  title: {
    ...typeStyle("title"),
    color: Colors.ink,
  },
  subtitle: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
  },
  tailSpace: {
    height: Gap.cards,
  },
  completeWrap: {
    flex: 1,
    justifyContent: "center",
  },
  footer: {
    paddingTop: Space.xs,
    paddingBottom: Space.xs,
  },
  footerButton: {
    marginTop: 0,
  },
  footerError: {
    ...typeStyle("secondary"),
    color: Colors.red,
    textAlign: "center",
    marginBottom: Space.sm,
  },
});
