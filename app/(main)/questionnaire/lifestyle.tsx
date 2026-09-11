import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Text } from "react-native";

import { SectionScaffold } from "@/components/questionnaire/SectionScaffold";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { NumberInput } from "@/components/ui/NumberInput";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { TimePicker } from "@/components/ui/TimePicker";
import { TextField } from "@/components/ui/TextField";
import {
  EXERCISE_DURATION_OPTIONS,
  EXERCISE_FREQUENCY_OPTIONS,
  EXERCISE_TYPE_OPTIONS,
  RELATIONSHIP_SUPPORT_OPTIONS,
  SLEEP_QUALITY_OPTIONS,
  WATER_INTAKE_OPTIONS,
  YES_NO_OPTIONS,
  YES_NO_UNSURE_OPTIONS,
} from "@/lib/constants";
import { COPY } from "@/lib/copy";
import {
  jsonToLifestyleForm,
  lifestyleToJson,
} from "@/lib/questionnaire/mappers";
import {
  emptyLifestyle,
  lifestyleSchema,
  type LifestyleForm,
  type LifestyleParsed,
} from "@/lib/questionnaire/schemas";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";

export default function LifestyleScreen() {
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
  } = useForm<LifestyleForm, unknown, LifestyleParsed>({
    resolver: zodResolver(lifestyleSchema),
    defaultValues: emptyLifestyle(),
  });

  const commuteToCity = useWatch({ control, name: "commuteToCity" });

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await loadSection(session.user.id, "lifestyle");
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setLoadMessage(result.message ?? COPY.sectionLoadFailed);
      } else {
        reset(jsonToLifestyleForm(result.responses));
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id, loadSection, reset]);

  const onSubmit = handleSubmit(
    async (values) => {
      if (!session?.user.id) {
        return;
      }
      setSaveMessage(null);
      try {
        const result = await saveSection(
          session.user.id,
          "lifestyle",
          lifestyleToJson(values),
        );
        if (!result.ok) {
          setSaveMessage(result.message ?? COPY.sectionSaveFailed);
          return;
        }
        setShowComplete(true);
      } catch {
        setSaveMessage(COPY.sectionSaveFailed);
      }
    },
    () => {
      setSaveMessage(COPY.sectionNeedFix);
    },
  );

  return (
    <SectionScaffold
      title="Lifestyle"
      step={7}
      loading={!ready}
      footerTitle={COPY.sectionSave}
      onFooterPress={() => void onSubmit()}
      footerLoading={isSubmitting}
      footerDisabled={isSubmitting}
      showComplete={showComplete}
      onCompleteDone={() => router.replace(routes.qStress)}
      errorMessage={saveMessage}
    >
      {loadMessage ? (
        <Text className="mt-3 text-center text-coral">{loadMessage}</Text>
      ) : null}

      <Controller
        control={control}
        name="sleepHours"
        render={({ field: { value, onChange, onBlur } }) => (
          <NumberInput
            label="Sleep hours per night"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.sleepHours?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="sleepQuality"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Sleep quality"
            options={SLEEP_QUALITY_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.sleepQuality?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="relationships"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Relationships / social support"
            options={RELATIONSHIP_SUPPORT_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.relationships?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="exerciseTypes"
        render={({ field: { value, onChange } }) => (
          <CheckboxGroup
            label="Exercise type (choose all that apply)"
            options={EXERCISE_TYPE_OPTIONS}
            values={value}
            onChange={onChange}
            error={errors.exerciseTypes?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="exerciseFrequency"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Exercise frequency"
            options={EXERCISE_FREQUENCY_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.exerciseFrequency?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="exerciseDuration"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Exercise duration"
            options={EXERCISE_DURATION_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.exerciseDuration?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="waterIntake"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Water intake"
            options={WATER_INTAKE_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.waterIntake?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="placeOfWork"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={COPY.placeOfWorkLabel}
            hint={COPY.placeOfWorkHint}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="sentences"
            error={errors.placeOfWork?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="commuteToCity"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label={COPY.commuteToCityLabel}
            options={YES_NO_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.commuteToCity?.message}
          />
        )}
      />
      {commuteToCity === "yes" ? (
        <>
          <Controller
            control={control}
            name="commuteMethod"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label={COPY.commuteMethodLabel}
                hint={COPY.commuteMethodHint}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="sentences"
                error={errors.commuteMethod?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="commuteDuration"
            render={({ field: { value, onChange } }) => (
              <TimePicker
                label={COPY.commuteDurationLabel}
                hint={COPY.commuteDurationHint}
                value={value}
                onChange={onChange}
                error={errors.commuteDuration?.message}
              />
            )}
          />
        </>
      ) : null}

      <Controller
        control={control}
        name="pollutantExposure"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label={COPY.pollutantExposureLabel}
            options={YES_NO_UNSURE_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.pollutantExposure?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="vehicleExhaust"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label={COPY.vehicleExhaustLabel}
            options={YES_NO_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.vehicleExhaust?.message}
          />
        )}
      />

    </SectionScaffold>
  );
}
