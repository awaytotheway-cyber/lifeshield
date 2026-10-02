import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler, StyleSheet, Text, View } from "react-native";

import { SymptomInterruptCard } from "@/components/questionnaire/SymptomInterruptCard";
import { DangerButton, PrimaryButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { COPY } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
import { useTriageStore } from "@/stores/triage-store";

type SymptomInterruptProps = {
  saving?: boolean;
  errorMessage?: string | null;
  onYes: () => void;
  onNo: () => void;
};

/**
 * Safety pause after Reproductive (section 2), Family History (section 5),
 * and the Follow-up Hub symptom re-check.
 * Yes → Pathway B (questionnaire locks). No → continue.
 * Hardware back is swallowed so this step cannot be skipped.
 */
export function SymptomInterrupt({
  saving = false,
  errorMessage,
  onYes,
  onNo,
}: SymptomInterruptProps) {
  const [answer, setAnswer] = useState<string | undefined>(undefined);
  const [localError, setLocalError] = useState<string | null>(null);
  const triageStatus = useTriageStore((state) => state.status);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  const confirm = () => {
    if (answer !== "yes" && answer !== "no") {
      setLocalError(COPY.interruptNeedAnswer);
      return;
    }
    setLocalError(null);
    if (answer === "yes") {
      onYes();
      return;
    }
    onNo();
  };

  const footer = (
    <View style={styles.footer}>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {answer === "yes" ? (
        <DangerButton
          title={COPY.interruptYes}
          onPress={confirm}
          loading={saving}
          disabled={saving}
          style={styles.footerButton}
        />
      ) : (
        <PrimaryButton
          title={COPY.interruptNo}
          onPress={confirm}
          loading={saving}
          disabled={saving}
          style={styles.footerButton}
        />
      )}
    </View>
  );

  return (
    <Screen scroll footer={footer}>
      <Text style={styles.title} accessibilityRole="header">
        {COPY.interruptTitle}
      </Text>
      <Text style={styles.body}>{COPY.interruptBody}</Text>
      <View style={styles.cardWrap}>
        <SymptomInterruptCard
          question={COPY.interruptQuestion}
          value={answer}
          onChange={(value) => {
            setAnswer(value);
            setLocalError(null);
          }}
          error={localError ?? undefined}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typeStyle("title"),
    color: Colors.ink,
  },
  body: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
  },
  cardWrap: {
    marginTop: Gap.afterTitle,
  },
  footer: {
    paddingTop: Space.xs,
    paddingBottom: Space.xs,
  },
  footerButton: {
    marginTop: 0,
  },
  error: {
    ...typeStyle("secondary"),
    color: Colors.red,
    textAlign: "center",
    marginBottom: Space.sm,
  },
});
