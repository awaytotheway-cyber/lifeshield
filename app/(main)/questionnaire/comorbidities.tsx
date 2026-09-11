import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Text } from "react-native";

import { ClinicalTerm } from "@/components/ClinicalTerm";
import { SectionScaffold } from "@/components/questionnaire/SectionScaffold";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { TextField } from "@/components/ui/TextField";
import {
  BMI_OBESITY_HINT,
  CHRONIC_INFECTION_OPTIONS,
  GILBERT_OPTIONS,
  YES_NO_OPTIONS,
} from "@/lib/constants";
import { COPY } from "@/lib/copy";
import {
  jsonToComorbiditiesForm,
  comorbiditiesToJson,
} from "@/lib/questionnaire/mappers";
import { parseFiniteNumber } from "@/lib/questionnaire/numbers";
import {
  comorbiditiesSchema,
  emptyComorbidities,
  type ComorbiditiesForm,
  type ComorbiditiesParsed,
} from "@/lib/questionnaire/schemas";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";

export default function ComorbiditiesScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const loadSection = useQuestionnaireStore((state) => state.loadSection);
  const saveSection = useQuestionnaireStore((state) => state.saveSection);
  const loadProfile = useQuestionnaireStore((state) => state.loadProfile);
  const [ready, setReady] = useState(false);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [bmi, setBmi] = useState<number | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ComorbiditiesForm, unknown, ComorbiditiesParsed>({
    resolver: zodResolver(comorbiditiesSchema),
    defaultValues: emptyComorbidities(),
  });

  const thyroidDisease = useWatch({ control, name: "thyroidDisease" });

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const [sectionResult, profileResult] = await Promise.all([
        loadSection(session.user.id, "comorbidities"),
        loadProfile(session.user.id),
      ]);
      if (cancelled) {
        return;
      }
      if (!sectionResult.ok) {
        setLoadMessage(sectionResult.message ?? COPY.sectionLoadFailed);
      } else {
        reset(jsonToComorbiditiesForm(sectionResult.responses));
      }
      const profileBmi = parseFiniteNumber(profileResult.profile?.bmi);
      setBmi(profileBmi);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id, loadSection, loadProfile, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!session?.user.id) {
      return;
    }
    setSaveMessage(null);
    const result = await saveSection(
      session.user.id,
      "comorbidities",
      comorbiditiesToJson(values),
    );
    if (!result.ok) {
      setSaveMessage(result.message ?? COPY.sectionSaveFailed);
      return;
    }
    setShowComplete(true);
  });

  const showObesityHint = bmi !== null && bmi >= BMI_OBESITY_HINT;

  return (
    <SectionScaffold
      title="Other conditions"
      step={4}
      loading={!ready}
      footerTitle={COPY.sectionSave}
      onFooterPress={() => void onSubmit()}
      footerLoading={isSubmitting}
      footerDisabled={isSubmitting}
      showComplete={showComplete}
      onCompleteDone={() => router.replace(routes.qFamilyHistory)}
      errorMessage={saveMessage}
    >
      {loadMessage ? (
        <Text className="mt-3 text-center text-coral">{loadMessage}</Text>
      ) : null}

      <ClinicalTerm termKey="gilbert" />
      <Controller
        control={control}
        name="gilbert"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Have you been told you have this mild bilirubin difference?"
            options={GILBERT_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.gilbert?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="gallstones"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Gallstones"
            options={YES_NO_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.gallstones?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="obesity"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Obesity"
            options={YES_NO_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.obesity?.message}
          />
        )}
      />
      {showObesityHint ? (
        <Text className="mt-2 text-teal">{COPY.obesityBmiHint}</Text>
      ) : null}

      <Controller
        control={control}
        name="diabetes"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Diabetes"
            options={YES_NO_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.diabetes?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="thyroidDisease"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Thyroid condition"
            options={YES_NO_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.thyroidDisease?.message}
          />
        )}
      />
      {thyroidDisease === "yes" ? (
        <Controller
          control={control}
          name="thyroidType"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextField
              label="Type of thyroid condition"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="sentences"
              error={errors.thyroidType?.message}
            />
          )}
        />
      ) : null}

      <ClinicalTerm termKey="hashimoto" />
      <ClinicalTerm termKey="graves" />
      <Controller
        control={control}
        name="autoimmuneThyroid"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Active autoimmune thyroid condition (the two types above)"
            options={YES_NO_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.autoimmuneThyroid?.message}
            whyAsk={COPY.whyAskThyroid}
          />
        )}
      />

      <Controller
        control={control}
        name="chronicInfections"
        render={({ field: { value, onChange } }) => (
          <CheckboxGroup
            label="Ongoing or repeated infections (choose all that apply)"
            options={CHRONIC_INFECTION_OPTIONS}
            values={value}
            onChange={onChange}
            error={errors.chronicInfections?.message}
          />
        )}
      />

    </SectionScaffold>
  );
}
