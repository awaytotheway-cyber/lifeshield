import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text } from "react-native";

import { SectionScaffold } from "@/components/questionnaire/SectionScaffold";
import { RadioGroup } from "@/components/ui/RadioGroup";
import {
  STRESS_LEVEL_OPTIONS,
  STRESS_REACH_OUT_OPTIONS,
  STRESS_VIEW_OPTIONS,
} from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { jsonToStressForm, stressToJson } from "@/lib/questionnaire/mappers";
import {
  emptyStress,
  stressSchema,
  type StressForm,
  type StressParsed,
} from "@/lib/questionnaire/schemas";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";

export default function StressScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const loadSection = useQuestionnaireStore((state) => state.loadSection);
  const saveSection = useQuestionnaireStore((state) => state.saveSection);
  const [ready, setReady] = useState(false);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showComplete, setShowComplete] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StressForm, unknown, StressParsed>({
    resolver: zodResolver(stressSchema),
    defaultValues: emptyStress(),
  });

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await loadSection(session.user.id, "stress");
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setLoadMessage(result.message ?? COPY.sectionLoadFailed);
      } else {
        reset(jsonToStressForm(result.responses));
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id, loadSection, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!session?.user.id) {
      return;
    }
    setSaveMessage(null);
    const result = await saveSection(
      session.user.id,
      "stress",
      stressToJson(values),
    );
    if (!result.ok) {
      setSaveMessage(result.message ?? COPY.sectionSaveFailed);
      return;
    }
    setShowComplete(true);
  });

  return (
    <SectionScaffold
      title="Stress"
      step={8}
      loading={!ready}
      footerTitle={COPY.sectionSave}
      onFooterPress={() => void onSubmit()}
      footerLoading={isSubmitting}
      footerDisabled={isSubmitting}
      showComplete={showComplete}
      onCompleteDone={() => router.replace(routes.qDiet)}
      errorMessage={saveMessage}
    >
      {loadMessage ? (
        <Text className="mt-3 text-center text-coral">{loadMessage}</Text>
      ) : null}

      <Text className="mt-4 text-center text-teal">{COPY.stressFramingNote}</Text>

      <Controller
        control={control}
        name="stressLevel"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="How would you rate your usual stress?"
            options={STRESS_LEVEL_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.stressLevel?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="stressView"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label={COPY.stressExactView}
            options={STRESS_VIEW_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.stressView?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="stressReachOut"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label={COPY.stressExactReachOut}
            options={STRESS_REACH_OUT_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.stressReachOut?.message}
          />
        )}
      />

    </SectionScaffold>
  );
}
