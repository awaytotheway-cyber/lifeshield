import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Text } from "react-native";

import { QuestionCard } from "@/components/questionnaire/QuestionCard";
import { SectionScaffold } from "@/components/questionnaire/SectionScaffold";
import { DatePicker } from "@/components/ui/DatePicker";
import { NumberInput } from "@/components/ui/NumberInput";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { SelectPicker } from "@/components/ui/SelectPicker";
import { TextField } from "@/components/ui/TextField";
import {
  COUNTRY_OPTIONS,
  ETHNICITY_OPTIONS,
  HIP_MEASURE_HINT,
  SEX_OPTIONS,
  WAIST_MEASURE_HINT,
} from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { dateFromYmd, todayLocalDate } from "@/lib/datetime";
import {
  demographicsToProfile,
  profileToDemographicsForm,
} from "@/lib/questionnaire/mappers";
import { ageFromDob, calcBmi, calcWhr } from "@/lib/questionnaire/numbers";
import {
  demographicsSchema,
  emptyDemographics,
  type DemographicsForm,
  type DemographicsParsed,
} from "@/lib/questionnaire/schemas";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";

export default function DemographicsScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const loadProfile = useQuestionnaireStore((state) => state.loadProfile);
  const saveProfile = useQuestionnaireStore((state) => state.saveProfile);

  const [ready, setReady] = useState(false);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showComplete, setShowComplete] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DemographicsForm, unknown, DemographicsParsed>({
    resolver: zodResolver(demographicsSchema),
    defaultValues: emptyDemographics(),
  });

  const dateOfBirth = useWatch({ control, name: "dateOfBirth" });
  const heightCm = useWatch({ control, name: "heightCm" });
  const weightKg = useWatch({ control, name: "weightKg" });
  const waistCm = useWatch({ control, name: "waistCm" });
  const hipCm = useWatch({ control, name: "hipCm" });
  const ethnicity = useWatch({ control, name: "ethnicity" });
  const countryOfOrigin = useWatch({ control, name: "countryOfOrigin" });

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await loadProfile(session.user.id);
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setLoadMessage(result.message ?? COPY.sectionLoadFailed);
      } else {
        reset(profileToDemographicsForm(result.profile));
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id, loadProfile, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!session?.user.id) {
      return;
    }
    setSaveMessage(null);
    const result = await saveProfile(
      session.user.id,
      demographicsToProfile(values),
    );
    if (!result.ok) {
      setSaveMessage(result.message ?? COPY.sectionSaveFailed);
      return;
    }
    setShowComplete(true);
  });

  const age = ageFromDob(dateOfBirth ?? "");
  const bmi = calcBmi(heightCm, weightKg);
  const whr = calcWhr(waistCm, hipCm);

  return (
    <SectionScaffold
      title="Demographics & measurements"
      step={1}
      loading={!ready}
      footerTitle={COPY.sectionSave}
      onFooterPress={() => void onSubmit()}
      footerLoading={isSubmitting}
      footerDisabled={isSubmitting}
      showComplete={showComplete}
      onCompleteDone={() => router.replace(routes.qReproductive)}
      errorMessage={saveMessage}
    >
      {loadMessage ? (
        <Text className="mt-3 text-center text-coral">{loadMessage}</Text>
      ) : null}

      <Controller
        control={control}
        name="dateOfBirth"
        render={({ field: { value, onChange } }) => (
          <DatePicker
            label="Date of birth"
            value={value}
            onChange={onChange}
            error={errors.dateOfBirth?.message}
            maximumDate={todayLocalDate()}
            minimumDate={dateFromYmd(1920, 1, 1)}
          />
        )}
      />
      <Text className="mt-2 text-teal">
        {COPY.ageLabel}: {age === null ? "—" : `${age} years`}
      </Text>

      <Controller
        control={control}
        name="sex"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Sex"
            options={SEX_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.sex?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="heightCm"
        render={({ field: { value, onChange, onBlur } }) => (
          <NumberInput
            label="Height (cm)"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.heightCm?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="weightKg"
        render={({ field: { value, onChange, onBlur } }) => (
          <NumberInput
            label="Weight (kg)"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.weightKg?.message}
          />
        )}
      />
      <Text className="mt-3 text-teal">
        {COPY.bmiLabel}: {bmi === null ? "—" : String(bmi)}
      </Text>
      <Text className="mt-1 text-charcoal">{COPY.bmiHint}</Text>

      <QuestionCard title="Waist (cm)" hint={WAIST_MEASURE_HINT}>
        <Controller
          control={control}
          name="waistCm"
          render={({ field: { value, onChange, onBlur } }) => (
            <NumberInput
              label="Waist measurement"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.waistCm?.message}
            />
          )}
        />
      </QuestionCard>

      <QuestionCard title="Hip (cm)" hint={HIP_MEASURE_HINT}>
        <Controller
          control={control}
          name="hipCm"
          render={({ field: { value, onChange, onBlur } }) => (
            <NumberInput
              label="Hip measurement"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.hipCm?.message}
            />
          )}
        />
      </QuestionCard>
      <Text className="mt-3 text-teal">
        {COPY.whrLabel}: {whr === null ? "—" : String(whr)}
      </Text>

      <Controller
        control={control}
        name="ethnicity"
        render={({ field: { value, onChange } }) => (
          <SelectPicker
            label="Ethnicity"
            options={ETHNICITY_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.ethnicity?.message}
            whyAsk={COPY.whyAskEthnicity}
          />
        )}
      />
      {ethnicity === "other" ? (
        <Controller
          control={control}
          name="ethnicityOther"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextField
              label="Please describe"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="words"
              error={errors.ethnicityOther?.message}
            />
          )}
        />
      ) : null}

      <Controller
        control={control}
        name="countryOfOrigin"
        render={({ field: { value, onChange } }) => (
          <SelectPicker
            label="Country of origin"
            options={COUNTRY_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.countryOfOrigin?.message}
          />
        )}
      />
      {countryOfOrigin === "other" ? (
        <Controller
          control={control}
          name="countryOther"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextField
              label="Please enter country"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="words"
              error={errors.countryOther?.message}
            />
          )}
        />
      ) : null}

    </SectionScaffold>
  );
}
