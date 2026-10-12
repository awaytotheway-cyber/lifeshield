import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Text } from "react-native";

import {
  CustomFields,
  useCustomAnswers,
} from "@/components/questionnaire/CustomFields";
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
import { resolveLabel, resolveOptionLabel } from "@/lib/app-content";
import { useAppContent } from "@/lib/content-context";
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
  const content = useAppContent();
  const custom = useCustomAnswers();
  const SECTION = "lifestyle";
  const label = (key: string, fallback: string) =>
    resolveLabel(content, SECTION, key, fallback);
  // Locked rows keep their option values; only the labels can move.
  const opts = (
    key: string,
    options: readonly { value: string; label: string }[],
  ) =>
    options.map((option) => ({
      value: option.value,
      label: resolveOptionLabel(content, SECTION, key, option.value, option.label),
    }));
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
        custom.hydrate(result.responses as Record<string, unknown>);
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
          {
        ...lifestyleToJson(values),
        ...custom.toJson(),
      },
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
            label={label("sleep_hours", "Sleep hours per night")}
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
            label={label("sleep_quality", "Sleep quality")}
            options={opts("sleep_quality", SLEEP_QUALITY_OPTIONS)}
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
            label={label("relationships", "Relationships / social support")}
            options={opts("relationships", RELATIONSHIP_SUPPORT_OPTIONS)}
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
            label={label("exercise_frequency", "Exercise frequency")}
            options={opts("exercise_frequency", EXERCISE_FREQUENCY_OPTIONS)}
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
            label={label("water_intake", "Water intake")}
            options={opts("water_intake", WATER_INTAKE_OPTIONS)}
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
            label={label("place_of_work", COPY.placeOfWorkLabel)}
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
            label={label("pollutant_exposure", COPY.pollutantExposureLabel)}
            options={opts("pollutant_exposure", YES_NO_UNSURE_OPTIONS)}
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
            label={label("vehicle_exhaust", COPY.vehicleExhaustLabel)}
            options={opts("vehicle_exhaust", YES_NO_OPTIONS)}
            value={value}
            onChange={onChange}
            error={errors.vehicleExhaust?.message}
          />
        )}
      />

      <CustomFields
        section={SECTION}
        answers={custom.answers}
        setAnswer={custom.setAnswer}
      />
    </SectionScaffold>
  );
}
