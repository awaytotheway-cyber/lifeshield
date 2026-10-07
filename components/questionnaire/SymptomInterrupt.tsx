import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler, Text } from "react-native";

import { SymptomInterruptCard } from "@/components/questionnaire/SymptomInterruptCard";
import { DangerButton, PrimaryButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { COPY } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { useTriageStore } from "@/stores/triage-store";
import { Accent, Ink, SpecimenType } from "@/lib/specimen-tokens";

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

  return (
    <Screen scroll>
      <Text
        style={{
          fontFamily: SpecimenType.serif,
          fontSize: 26,
          color: Accent.tag,
        }}
      >
        {COPY.interruptTitle}
      </Text>
      <Text
        style={{
          marginTop: 12,
          fontFamily: SpecimenType.mono,
          fontSize: 17,
          lineHeight: 26,
          color: Ink.soft,
        }}
      >
        {COPY.interruptBody}
      </Text>
      <SymptomInterruptCard
        question={COPY.interruptQuestion}
        value={answer}
        onChange={(value) => {
          setAnswer(value);
          setLocalError(null);
        }}
        error={localError ?? undefined}
      />
      {errorMessage ? (
        <Text
          style={{
            marginTop: 12,
            textAlign: "center",
            color: Accent.tag,
            fontFamily: SpecimenType.mono,
            fontSize: 15,
          }}
        >
          {errorMessage}
        </Text>
      ) : null}
      {answer === "yes" ? (
        <DangerButton
          title={COPY.interruptYes}
          onPress={confirm}
          loading={saving}
          disabled={saving}
        />
      ) : (
        <PrimaryButton
          title={COPY.interruptNo}
          onPress={confirm}
          loading={saving}
          disabled={saving}
        />
      )}
    </Screen>
  );
}
