import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";

import { SectionNotice } from "@/components/questionnaire/SectionNotice";
import { SectionScaffold } from "@/components/questionnaire/SectionScaffold";
import { SecondaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { SelectPicker } from "@/components/ui/SelectPicker";
import { MAMMOGRAM_FINDING_OPTIONS, YES_NO_OPTIONS } from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { Colors, Gap, typeStyle } from "@/lib/theme";
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
      subtitle="The last step. Then we work out which tests to suggest."
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
      {loadMessage ? <SectionNotice message={loadMessage} /> : null}

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
        <View style={styles.mammograms}>
          {errors.mammograms?.message ? (
            <SectionNotice message={String(errors.mammograms.message)} />
          ) : null}
          {fields.map((field, index) => (
            <Card key={field.id}>
              <Text style={styles.mammogramLabel}>Mammogram {index + 1}</Text>
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
                <TextButton
                  title={COPY.removeMammogram}
                  onPress={() => remove(index)}
                  style={styles.remove}
                />
              ) : null}
            </Card>
          ))}
          <SecondaryButton
            title={COPY.addMammogram}
            icon="plus"
            onPress={() => append({ date: "", finding: "" })}
          />
        </View>
      ) : null}

    </SectionScaffold>
  );
}

const styles = StyleSheet.create({
  mammograms: {
    marginTop: Gap.cards,
    gap: Gap.cards,
  },
  mammogramLabel: {
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  remove: {
    alignSelf: "flex-start",
  },
});
