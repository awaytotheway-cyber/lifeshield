import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { Text, View } from "react-native";

import {
  CustomFields,
  useCustomAnswers,
} from "@/components/questionnaire/CustomFields";
import { SectionScaffold } from "@/components/questionnaire/SectionScaffold";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { SelectPicker } from "@/components/ui/SelectPicker";
import { MAMMOGRAM_FINDING_OPTIONS, YES_NO_OPTIONS } from "@/lib/constants";
import { resolveLabel, resolveOptionLabel } from "@/lib/app-content";
import { useAppContent } from "@/lib/content-context";
import { COPY } from "@/lib/copy";
import { dateFromYmd, todayLocalDate } from "@/lib/datetime";
import {
  jsonToPriorScreeningForm,
  priorScreeningToJson,
} from "@/lib/questionnaire/mappers";
import {
  emptyPriorScreening,
  priorScreeningSchema,
  type PriorScreeningForm,
  type PriorScreeningParsed,
} from "@/lib/questionnaire/schemas";
import { collectRecommendations, PHASE1_LABS } from "@/lib/rules-engine";
import { loadClinicalThresholds } from "@/lib/load-thresholds";
import { factsFromSavedAnswers } from "@/lib/rules-facts";
import { loadOwnMedications } from "@/lib/supplements-io";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { useTriageStore } from "@/stores/triage-store";

export default function PriorScreeningScreen() {
  const router = useRouter();
  const content = useAppContent();
  const custom = useCustomAnswers();
  const SECTION = "prior_screening";
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
  const triageStatus = useTriageStore((state) => state.status);
  const loadSection = useQuestionnaireStore((state) => state.loadSection);
  const saveSection = useQuestionnaireStore((state) => state.saveSection);
  const loadForEngine = useQuestionnaireStore((state) => state.loadForEngine);
  const syncTestOrders = useQuestionnaireStore(
    (state) => state.syncTestOrders,
  );
  const [ready, setReady] = useState(false);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showComplete, setShowComplete] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PriorScreeningForm, unknown, PriorScreeningParsed>({
    resolver: zodResolver(priorScreeningSchema),
    defaultValues: emptyPriorScreening(),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "mammograms",
  });

  const previousMammogram = useWatch({ control, name: "previousMammogram" });

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await loadSection(session.user.id, "prior_screening");
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setLoadMessage(result.message ?? COPY.sectionLoadFailed);
      } else {
        reset(jsonToPriorScreeningForm(result.responses));
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
    if (triageStatus === "locked") {
      setSaveMessage(COPY.pathwayBNoSubmit);
      return;
    }
    setSaveMessage(null);

    const saved = await saveSection(
      session.user.id,
      "prior_screening",
      {
        ...priorScreeningToJson(values),
        ...custom.toJson(),
      },
    );
    if (!saved.ok) {
      setSaveMessage(saved.message ?? COPY.sectionSaveFailed);
      return;
    }

    try {
      const [bundle, medications] = await Promise.all([
        loadForEngine(session.user.id),
        loadOwnMedications(session.user.id),
      ]);
      if (!bundle.ok) {
        setSaveMessage(bundle.message ?? COPY.resultsSaveFailed);
        return;
      }
      const facts = factsFromSavedAnswers({
        bmi: bundle.bmi,
        sections: bundle.sections,
        // Hormone therapy here can trigger the DUTCH test and stool
        // analysis, so the test recommendations written below need it.
        medications: medications.rows,
      });
      const thresholds = await loadClinicalThresholds();
      const recommendations = collectRecommendations(
        facts,
        PHASE1_LABS,
        thresholds,
      );
      // Full sync: also drops recommendations that no longer apply, but never
      // touches an order the patient has already bought.
      const written = await syncTestOrders(session.user.id, recommendations, {
        removeStale: true,
        tiers: [3, 4],
      });
      if (!written.ok) {
        setSaveMessage(written.message ?? COPY.resultsSaveFailed);
        return;
      }
      setShowComplete(true);
    } catch {
      setSaveMessage(COPY.resultsSaveFailed);
    }
  });

  return (
    <SectionScaffold
      title="Prior screening"
      step={10}
      loading={!ready}
      footerTitle={COPY.sectionSubmitResults}
      onFooterPress={() => void onSubmit()}
      footerLoading={isSubmitting}
      footerDisabled={isSubmitting}
      showComplete={showComplete}
      onCompleteDone={() => router.replace(routes.results)}
      errorMessage={saveMessage}
    >
      {loadMessage ? (
        <Text className="mt-3 text-center text-worthDiscussing">{loadMessage}</Text>
      ) : null}

      <Controller
        control={control}
        name="previousMammogram"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label={label("previous_mammogram", "Have you had a previous mammogram?")}
            options={opts("previous_mammogram", YES_NO_OPTIONS)}
            value={value}
            onChange={onChange}
            error={errors.previousMammogram?.message}
          />
        )}
      />

      {previousMammogram === "yes" ? (
        <View className="mt-2">
          {errors.mammograms?.message ? (
            <Text className="text-worthDiscussing">
              {String(errors.mammograms.message)}
            </Text>
          ) : null}
          {fields.map((field, index) => (
            <View key={field.id} className="mt-3 rounded-[20px] bg-white px-4 py-3">
              <Text className="text-ink">Mammogram {index + 1}</Text>
              <Controller
                control={control}
                name={`mammograms.${index}.date`}
                render={({ field: { value, onChange } }) => (
                  <DatePicker
                    label="Date"
                    value={value}
                    onChange={onChange}
                    maximumDate={todayLocalDate()}
                    minimumDate={dateFromYmd(1950, 1, 1)}
                  />
                )}
              />
              <Controller
                control={control}
                name={`mammograms.${index}.finding`}
                render={({ field: { value, onChange } }) => (
                  <SelectPicker
                    label="Finding"
                    options={MAMMOGRAM_FINDING_OPTIONS}
                    value={value}
                    onChange={onChange}
                  />
                )}
              />
              {fields.length > 1 ? (
                <Button
                  title={COPY.removeMammogram}
                  variant="ghost"
                  onPress={() => remove(index)}
                />
              ) : null}
            </View>
          ))}
          <Button
            title={COPY.addMammogram}
            variant="ghost"
            onPress={() => append({ date: "", finding: "" })}
          />
        </View>
      ) : null}

      <CustomFields
        section={SECTION}
        answers={custom.answers}
        setAnswer={custom.setAnswer}
      />
    </SectionScaffold>
  );
}
