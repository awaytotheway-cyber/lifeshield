import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { Text, View } from "react-native";

import { SectionScaffold } from "@/components/questionnaire/SectionScaffold";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { SelectPicker } from "@/components/ui/SelectPicker";
import { MAMMOGRAM_FINDING_OPTIONS, YES_NO_OPTIONS } from "@/lib/constants";
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
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { useTriageStore } from "@/stores/triage-store";

export default function PriorScreeningScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const loadSection = useQuestionnaireStore((state) => state.loadSection);
  const saveSection = useQuestionnaireStore((state) => state.saveSection);
  const loadForEngine = useQuestionnaireStore((state) => state.loadForEngine);
  const replaceTestOrders = useQuestionnaireStore(
    (state) => state.replaceTestOrders,
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
      priorScreeningToJson(values),
    );
    if (!saved.ok) {
      setSaveMessage(saved.message ?? COPY.sectionSaveFailed);
      return;
    }

    try {
      const bundle = await loadForEngine(session.user.id);
      if (!bundle.ok) {
        setSaveMessage(bundle.message ?? COPY.resultsSaveFailed);
        return;
      }
      const facts = factsFromSavedAnswers({
        bmi: bundle.bmi,
        sections: bundle.sections,
      });
      const thresholds = await loadClinicalThresholds();
      const recommendations = collectRecommendations(
        facts,
        PHASE1_LABS,
        thresholds,
      );
      const written = await replaceTestOrders(session.user.id, recommendations);
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
        <Text className="mt-3 text-center text-coral">{loadMessage}</Text>
      ) : null}

      <Controller
        control={control}
        name="previousMammogram"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Have you had a previous mammogram?"
            options={YES_NO_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.previousMammogram?.message}
          />
        )}
      />

      {previousMammogram === "yes" ? (
        <View className="mt-2">
          {errors.mammograms?.message ? (
            <Text className="text-coral">
              {String(errors.mammograms.message)}
            </Text>
          ) : null}
          {fields.map((field, index) => (
            <View key={field.id} className="mt-3 rounded-xl border border-white/10 bg-white/6 px-4 py-3">
              <Text className="text-charcoal">Mammogram {index + 1}</Text>
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

    </SectionScaffold>
  );
}
