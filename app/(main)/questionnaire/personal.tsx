import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Text } from "react-native";

import { QuestionCard } from "@/components/questionnaire/QuestionCard";
import {
  CustomFields,
  useCustomAnswers,
} from "@/components/questionnaire/CustomFields";
import { SectionScaffold } from "@/components/questionnaire/SectionScaffold";
import { NumberInput } from "@/components/ui/NumberInput";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { TextField } from "@/components/ui/TextField";
import {
  ALCOHOL_UNIT_HINT,
  CAFFEINE_OPTIONS,
  SMOKING_OPTIONS,
  YES_NO_OPTIONS,
} from "@/lib/constants";
import { resolveLabel, resolveOptionLabel } from "@/lib/app-content";
import { useAppContent } from "@/lib/content-context";
import { COPY } from "@/lib/copy";
import {
  calcPackYears,
  jsonToPersonalHistoryForm,
  personalHistoryToJson,
} from "@/lib/questionnaire/mappers";
import {
  emptyPersonalHistory,
  personalHistorySchema,
  type PersonalHistoryForm,
  type PersonalHistoryParsed,
} from "@/lib/questionnaire/schemas";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";

export default function PersonalHistoryScreen() {
  const router = useRouter();
  const content = useAppContent();
  const custom = useCustomAnswers();
  const SECTION = "personal_history";
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
  } = useForm<PersonalHistoryForm, unknown, PersonalHistoryParsed>({
    resolver: zodResolver(personalHistorySchema),
    defaultValues: emptyPersonalHistory(),
  });

  const smoking = useWatch({ control, name: "smoking" });
  const vaping = useWatch({ control, name: "vaping" });
  const drugs = useWatch({ control, name: "recreationalDrugs" });
  const cigsPerDay = useWatch({ control, name: "cigsPerDay" });
  const smokingYears = useWatch({ control, name: "smokingYears" });
  const smoked = smoking === "current" || smoking === "former";
  const packYears = smoked ? calcPackYears(cigsPerDay, smokingYears) : null;

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await loadSection(session.user.id, "personal_history");
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setLoadMessage(result.message ?? COPY.sectionLoadFailed);
      } else {
        reset(jsonToPersonalHistoryForm(result.responses));
        custom.hydrate(result.responses as Record<string, unknown>);
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
      "personal_history",
      {
        ...personalHistoryToJson(values),
        ...custom.toJson(),
      },
    );
    if (!result.ok) {
      setSaveMessage(result.message ?? COPY.sectionSaveFailed);
      return;
    }
    setShowComplete(true);
  });

  return (
    <SectionScaffold
      title="Personal history"
      step={6}
      loading={!ready}
      footerTitle={COPY.sectionSave}
      onFooterPress={() => void onSubmit()}
      footerLoading={isSubmitting}
      footerDisabled={isSubmitting}
      showComplete={showComplete}
      onCompleteDone={() => router.replace(routes.qLifestyle)}
      errorMessage={saveMessage}
    >
      {loadMessage ? (
        <Text className="mt-3 text-center text-coral">{loadMessage}</Text>
      ) : null}

      <Controller
        control={control}
        name="smoking"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label={label("smoking", "Smoking")}
            options={opts("smoking", SMOKING_OPTIONS)}
            value={value}
            onChange={onChange}
            error={errors.smoking?.message}
            whyAsk={COPY.whyAskPersonal}
          />
        )}
      />
      {smoked ? (
        <>
          <Controller
            control={control}
            name="cigsPerDay"
            render={({ field: { value, onChange, onBlur } }) => (
              <NumberInput
                label="Cigarettes per day"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.cigsPerDay?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="smokingYears"
            render={({ field: { value, onChange, onBlur } }) => (
              <NumberInput
                label="Years smoked"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.smokingYears?.message}
              />
            )}
          />
          <Text className="mt-3 text-teal">
            {COPY.packYearsLabel}: {packYears ?? "—"}
          </Text>
          <Text className="mt-1 text-charcoal">{COPY.packYearsHint}</Text>
        </>
      ) : null}

      <Controller
        control={control}
        name="vaping"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label={label("vaping", "Vaping")}
            options={opts("vaping", YES_NO_OPTIONS)}
            value={value}
            onChange={onChange}
            error={errors.vaping?.message}
          />
        )}
      />
      {vaping === "yes" ? (
        <Controller
          control={control}
          name="vapingFrequency"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextField
              label="How often do you vape?"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="sentences"
              error={errors.vapingFrequency?.message}
            />
          )}
        />
      ) : null}

      <QuestionCard
        title="Alcohol (units per week)"
        hint={ALCOHOL_UNIT_HINT}
        hintLabel={COPY.tooltipWhatsAUnit}
      >
        <Controller
          control={control}
          name="alcoholUnitsPerWeek"
          render={({ field: { value, onChange, onBlur } }) => (
            <NumberInput
              label={label("alcohol_units_per_week", "Units per week")}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.alcoholUnitsPerWeek?.message}
            />
          )}
        />
      </QuestionCard>

      <Controller
        control={control}
        name="recreationalDrugs"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label={label("recreational_drugs", "Recreational drugs")}
            options={opts("recreational_drugs", YES_NO_OPTIONS)}
            value={value}
            onChange={onChange}
            error={errors.recreationalDrugs?.message}
            whyAsk={COPY.whyAskPersonal}
          />
        )}
      />
      {drugs === "yes" ? (
        <Controller
          control={control}
          name="recreationalDrugsType"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextField
              label="Type (optional)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="sentences"
              error={errors.recreationalDrugsType?.message}
            />
          )}
        />
      ) : null}

      <Controller
        control={control}
        name="caffeine"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label={label("caffeine", "Caffeine (cups per day)")}
            options={opts("caffeine", CAFFEINE_OPTIONS)}
            value={value}
            onChange={onChange}
            error={errors.caffeine?.message}
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
