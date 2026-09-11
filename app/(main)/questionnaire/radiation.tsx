import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Text } from "react-native";

import { SectionScaffold } from "@/components/questionnaire/SectionScaffold";
import { NumberInput } from "@/components/ui/NumberInput";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { TextField } from "@/components/ui/TextField";
import { DatePicker } from "@/components/ui/DatePicker";
import { NIGHT_SHIFT_OPTIONS, RADIATION_TYPE_OPTIONS, YES_NO_OPTIONS } from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { dateFromYmd, todayLocalDate } from "@/lib/datetime";
import {
  jsonToRadiationForm,
  radiationToJson,
} from "@/lib/questionnaire/mappers";
import {
  emptyRadiation,
  radiationSchema,
  type RadiationForm,
  type RadiationParsed,
} from "@/lib/questionnaire/schemas";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";

export default function RadiationScreen() {
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
  } = useForm<RadiationForm, unknown, RadiationParsed>({
    resolver: zodResolver(radiationSchema),
    defaultValues: emptyRadiation(),
  });

  const radiationExposure = useWatch({ control, name: "radiationExposure" });
  const nightShift = useWatch({ control, name: "nightShift" });

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await loadSection(
        session.user.id,
        "radiation_occupational",
      );
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setLoadMessage(result.message ?? COPY.sectionLoadFailed);
      } else {
        reset(jsonToRadiationForm(result.responses));
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
      "radiation_occupational",
      radiationToJson(values),
    );
    if (!result.ok) {
      setSaveMessage(result.message ?? COPY.sectionSaveFailed);
      return;
    }
    setShowComplete(true);
  });

  return (
    <SectionScaffold
      title="Radiation & occupation"
      step={3}
      loading={!ready}
      footerTitle={COPY.sectionSave}
      onFooterPress={() => void onSubmit()}
      footerLoading={isSubmitting}
      footerDisabled={isSubmitting}
      showComplete={showComplete}
      onCompleteDone={() => router.replace(routes.qComorbidities)}
      errorMessage={saveMessage}
    >
      {loadMessage ? (
        <Text className="mt-3 text-center text-coral">{loadMessage}</Text>
      ) : null}

      <Controller
        control={control}
        name="radiationExposure"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Have you had radiation exposure?"
            options={YES_NO_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.radiationExposure?.message}
          />
        )}
      />
      {radiationExposure === "yes" ? (
        <>
          <Controller
            control={control}
            name="radiationType"
            render={({ field: { value, onChange } }) => (
              <RadioGroup
                label="Type of exposure"
                options={RADIATION_TYPE_OPTIONS}
                value={value}
                onChange={onChange}
                error={errors.radiationType?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="radiationBodyArea"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label="Body area"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="sentences"
                error={errors.radiationBodyArea?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="radiationDates"
            render={({ field: { value, onChange } }) => (
              <DatePicker
                label="Approximate date"
                hint={COPY.radiationDatesHint}
                value={value}
                onChange={onChange}
                error={errors.radiationDates?.message}
                maximumDate={todayLocalDate()}
                minimumDate={dateFromYmd(1950, 1, 1)}
              />
            )}
          />
        </>
      ) : null}

      <Controller
        control={control}
        name="occupation"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={COPY.occupationLabel}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="sentences"
            error={errors.occupation?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="nightShift"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label={COPY.nightShiftLabel}
            options={NIGHT_SHIFT_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.nightShift?.message}
          />
        )}
      />
      {nightShift === "current" || nightShift === "past" ? (
        <Controller
          control={control}
          name="nightShiftYears"
          render={({ field: { value, onChange, onBlur } }) => (
            <NumberInput
              label="Total years of night-shift work"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.nightShiftYears?.message}
            />
          )}
        />
      ) : null}

    </SectionScaffold>
  );
}
