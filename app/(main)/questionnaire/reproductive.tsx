import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Text } from "react-native";

import { ClinicalTerm } from "@/components/ClinicalTerm";
import {
  CustomFields,
  useCustomAnswers,
} from "@/components/questionnaire/CustomFields";
import { SectionScaffold } from "@/components/questionnaire/SectionScaffold";
import { SymptomInterrupt } from "@/components/questionnaire/SymptomInterrupt";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { NumberInput } from "@/components/ui/NumberInput";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { SelectPicker } from "@/components/ui/SelectPicker";
import { TextField } from "@/components/ui/TextField";
import {
  CONTRACEPTIVE_LAST_USE_OPTIONS,
  CONTRACEPTIVE_TYPE_OPTIONS,
  ESTROGEN_CONDITION_OPTIONS,
  MENOPAUSAL_STATUS_OPTIONS,
  MENSTRUAL_REGULARITY_OPTIONS,
  YES_NO_OPTIONS,
} from "@/lib/constants";
import { resolveLabel, resolveOptionLabel } from "@/lib/app-content";
import { useAppContent } from "@/lib/content-context";
import { COPY } from "@/lib/copy";
import {
  interruptClearedFromJson,
  jsonToReproductiveForm,
  reproductiveToJson,
  skippedReproductiveToJson,
} from "@/lib/questionnaire/mappers";
import { parseFiniteNumber } from "@/lib/questionnaire/numbers";
import {
  emptyReproductive,
  reproductiveSchema,
  type ReproductiveForm,
  type ReproductiveParsed,
} from "@/lib/questionnaire/schemas";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { useTriageStore } from "@/stores/triage-store";

type ProfileSex = "male" | "female" | "other" | null;

export default function ReproductiveScreen() {
  const router = useRouter();
  const content = useAppContent();
  const custom = useCustomAnswers();
  const SECTION = "reproductive_menstrual";
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
  const loadProfile = useQuestionnaireStore((state) => state.loadProfile);
  const lockFromInterrupt = useTriageStore((state) => state.lockFromInterrupt);

  const [ready, setReady] = useState(false);
  const [showInterrupt, setShowInterrupt] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [parsedCache, setParsedCache] = useState<ReproductiveParsed | null>(
    null,
  );
  /** Male path: we saved the skip JSON, not the full period/pregnancy form. */
  const [skipCached, setSkipCached] = useState(false);
  const [profileSex, setProfileSex] = useState<ProfileSex>(null);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [interruptError, setInterruptError] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);
  const [savingSkip, setSavingSkip] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReproductiveForm, unknown, ReproductiveParsed>({
    resolver: zodResolver(reproductiveSchema),
    defaultValues: emptyReproductive(),
  });

  const contraceptiveUse = useWatch({ control, name: "contraceptiveUse" });
  const amenorrhoea = useWatch({ control, name: "amenorrhoea" });
  const liveBirths = useWatch({ control, name: "liveBirths" });
  const breastfeeding = useWatch({ control, name: "breastfeeding" });

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [sectionResult, profileResult] = await Promise.all([
          loadSection(session.user.id, "reproductive_menstrual"),
          loadProfile(session.user.id),
        ]);
        if (cancelled) {
          return;
        }
        const sex = profileResult.profile?.sex;
        if (sex === "male" || sex === "female" || sex === "other") {
          setProfileSex(sex);
        } else {
          setProfileSex(null);
        }
        if (!sectionResult.ok) {
          setLoadMessage(sectionResult.message ?? COPY.sectionLoadFailed);
        } else {
          reset(jsonToReproductiveForm(sectionResult.responses));
          custom.hydrate(sectionResult.responses as Record<string, unknown>);
          // Safety first: if they already saved but have not answered the
          // interrupt, show it — even on the male skip path. Never skip this.
          if (
            sectionResult.responses &&
            !interruptClearedFromJson(sectionResult.responses)
          ) {
            setShowInterrupt(true);
          }
          if (!profileResult.ok) {
            setLoadMessage(profileResult.message ?? COPY.sectionLoadFailed);
          }
        }
      } catch {
        if (!cancelled) {
          setLoadMessage(COPY.sectionLoadFailed);
        }
      }
      if (!cancelled) {
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id, loadSection, loadProfile, reset]);

  const persist = async (
    parsed: ReproductiveParsed,
    interruptCleared: boolean,
  ) => {
    if (!session?.user.id) {
      return { ok: false as const, message: COPY.sectionSaveFailed };
    }
    return saveSection(
      session.user.id,
      "reproductive_menstrual",
      {
        ...reproductiveToJson(parsed, interruptCleared),
        ...custom.toJson(),
      },
    );
  };

  const persistSkipped = async (interruptCleared: boolean) => {
    if (!session?.user.id) {
      return { ok: false as const, message: COPY.sectionSaveFailed };
    }
    return saveSection(
      session.user.id,
      "reproductive_menstrual",
      {
        ...skippedReproductiveToJson(interruptCleared),
        ...custom.toJson(),
      },
    );
  };

  const onSubmit = handleSubmit(
    async (values) => {
      setSaveMessage(null);
      try {
        const result = await persist(values, false);
        if (!result.ok) {
          setSaveMessage(result.message ?? COPY.sectionSaveFailed);
          return;
        }
        setSkipCached(false);
        setParsedCache(values);
        setShowComplete(true);
      } catch {
        setSaveMessage(COPY.sectionSaveFailed);
      }
    },
    () => {
      // Required field was cleared — show a message, do not crash.
      setSaveMessage(COPY.sectionNeedFix);
    },
  );

  const onMaleContinue = async () => {
    setSaveMessage(null);
    setSavingSkip(true);
    try {
      const result = await persistSkipped(false);
      if (!result.ok) {
        setSaveMessage(result.message ?? COPY.sectionSaveFailed);
        return;
      }
      setSkipCached(true);
      setShowComplete(true);
    } catch {
      setSaveMessage(COPY.sectionSaveFailed);
    } finally {
      setSavingSkip(false);
    }
  };

  const onInterruptYes = async () => {
    if (!session?.user.id) {
      return;
    }
    setLocking(true);
    setInterruptError(null);
    try {
      const result = await lockFromInterrupt(session.user.id);
      if (!result.ok) {
        setInterruptError(result.message ?? COPY.interruptLockFailed);
        return;
      }
      router.replace(routes.pathwayB);
    } catch {
      setInterruptError(COPY.interruptLockFailed);
    } finally {
      setLocking(false);
    }
  };

  const onInterruptNo = async () => {
    if (!session?.user.id) {
      return;
    }
    setLocking(true);
    setInterruptError(null);
    try {
      // Male skip: save the skipped JSON + interrupt cleared so the hub
      // can mark section 2 done. Do not re-validate period questions.
      if (skipCached || profileSex === "male") {
        const result = await persistSkipped(true);
        if (!result.ok) {
          setInterruptError(result.message ?? COPY.sectionSaveFailed);
          return;
        }
        router.replace(routes.qRadiation);
        return;
      }

      let parsed = parsedCache;
      if (!parsed) {
        const loaded = await loadSection(
          session.user.id,
          "reproductive_menstrual",
        );
        const form = jsonToReproductiveForm(loaded.responses);
        const again = reproductiveSchema.safeParse(form);
        if (!again.success) {
          setShowInterrupt(false);
          setSaveMessage(COPY.sectionNeedFix);
          return;
        }
        parsed = again.data;
      }
      const result = await persist(parsed, true);
      if (!result.ok) {
        setInterruptError(result.message ?? COPY.sectionSaveFailed);
        return;
      }
      router.replace(routes.qRadiation);
    } catch {
      setInterruptError(COPY.sectionSaveFailed);
    } finally {
      setLocking(false);
    }
  };

  if (ready && showInterrupt) {
    return (
      <SymptomInterrupt
        saving={locking}
        errorMessage={interruptError}
        onYes={() => void onInterruptYes()}
        onNo={() => void onInterruptNo()}
      />
    );
  }

  const births = parseFiniteNumber(liveBirths) ?? 0;

  // No sex on the profile yet — send them back to section 1 rather than guessing.
  if (ready && profileSex === null) {
    return (
      <SectionScaffold
        title="Reproductive & menstrual history"
        step={2}
        loading={false}
        footerTitle={COPY.reproductiveGoSection1}
        onFooterPress={() => router.replace(routes.qDemographics)}
      >
        {loadMessage ? (
          <Text className="mt-3 text-center text-worthDiscussing">{loadMessage}</Text>
        ) : null}
        <Text className="mt-4 text-center text-ink">
          {COPY.reproductiveNeedSection1}
        </Text>
        <CustomFields
          section={SECTION}
          answers={custom.answers}
          setAnswer={custom.setAnswer}
        />
      </SectionScaffold>
    );
  }

  // Male: skip period / menopause / pregnancy questions, then still do the
  // safety interrupt (nipple discharge / skin / lump). Never skip that.
  if (ready && profileSex === "male") {
    return (
      <SectionScaffold
        title="Reproductive & menstrual history"
        step={2}
        loading={false}
        footerTitle={COPY.sectionSave}
        onFooterPress={() => void onMaleContinue()}
        footerLoading={savingSkip}
        footerDisabled={savingSkip}
        showComplete={showComplete}
        onCompleteDone={() => {
          setShowComplete(false);
          setShowInterrupt(true);
        }}
        errorMessage={saveMessage}
      >
        {loadMessage ? (
          <Text className="mt-3 text-center text-worthDiscussing">{loadMessage}</Text>
        ) : null}
        <Text className="mt-4 text-center text-ink">
          {COPY.reproductiveMaleSkip}
        </Text>
      </SectionScaffold>
    );
  }

  return (
    <SectionScaffold
      title="Reproductive & menstrual history"
      step={2}
      loading={!ready}
      footerTitle={COPY.sectionSave}
      onFooterPress={() => void onSubmit()}
      footerLoading={isSubmitting}
      footerDisabled={isSubmitting}
      showComplete={showComplete}
      onCompleteDone={() => {
        setShowComplete(false);
        setShowInterrupt(true);
      }}
      errorMessage={saveMessage}
    >
      {loadMessage ? (
        <Text className="mt-3 text-center text-worthDiscussing">{loadMessage}</Text>
      ) : null}

      <Controller
        control={control}
        name="ageAtFirstPeriod"
        render={({ field: { value, onChange, onBlur } }) => (
          <NumberInput
            label={label("age_at_first_period", "Age at first period")}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.ageAtFirstPeriod?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="contraceptiveUse"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label={label("contraceptive_use", COPY.contraceptiveUseLabel)}
            options={opts("contraceptive_use", YES_NO_OPTIONS)}
            value={value}
            onChange={onChange}
            error={errors.contraceptiveUse?.message}
            whyAsk={COPY.whyAskReproductive}
          />
        )}
      />
      {contraceptiveUse === "yes" ? (
        <>
          <Controller
            control={control}
            name="contraceptiveType"
            render={({ field: { value, onChange } }) => (
              <SelectPicker
                label="Type"
                options={CONTRACEPTIVE_TYPE_OPTIONS}
                value={value}
                onChange={onChange}
                error={errors.contraceptiveType?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="contraceptiveDurationYears"
            render={({ field: { value, onChange, onBlur } }) => (
              <NumberInput
                label="Duration (years)"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.contraceptiveDurationYears?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="contraceptiveLastUse"
            render={({ field: { value, onChange } }) => (
              <RadioGroup
                label={COPY.contraceptiveLastUseLabel}
                options={CONTRACEPTIVE_LAST_USE_OPTIONS}
                value={value}
                onChange={onChange}
                error={errors.contraceptiveLastUse?.message}
              />
            )}
          />
        </>
      ) : null}

      <Controller
        control={control}
        name="hrtUse"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label={label(
              "hrt_use",
              "Are you using, or have you used in the last 12 months, hormone replacement therapy (HRT)?",
            )}
            options={opts("hrt_use", YES_NO_OPTIONS)}
            value={value}
            onChange={onChange}
            error={errors.hrtUse?.message}
          />
        )}
      />

      <ClinicalTerm termKey="amenorrhoea" />
      <Controller
        control={control}
        name="amenorrhoea"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label={label("amenorrhoea", "Have you had missed periods?")}
            options={opts("amenorrhoea", YES_NO_OPTIONS)}
            value={value}
            onChange={onChange}
            error={errors.amenorrhoea?.message}
          />
        )}
      />
      {amenorrhoea === "yes" ? (
        <>
          <Controller
            control={control}
            name="amenorrhoeaEpisodes"
            render={({ field: { value, onChange, onBlur } }) => (
              <NumberInput
                label="How many episodes?"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.amenorrhoeaEpisodes?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="amenorrhoeaCause"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label="Cause (optional)"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="sentences"
                error={errors.amenorrhoeaCause?.message}
              />
            )}
          />
        </>
      ) : null}

      <Controller
        control={control}
        name="menstrualRegularity"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label={label("menstrual_regularity", COPY.menstrualRegularityLabel)}
            options={opts("menstrual_regularity", MENSTRUAL_REGULARITY_OPTIONS)}
            value={value}
            onChange={onChange}
            error={errors.menstrualRegularity?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="cycleLengthDays"
        render={({ field: { value, onChange, onBlur } }) => (
          <NumberInput
            label={label("cycle_length_days", "Cycle length (days)")}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.cycleLengthDays?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="menopausalStatus"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label={label("menopausal_status", COPY.menoStatusLabel)}
            options={opts("menopausal_status", MENOPAUSAL_STATUS_OPTIONS)}
            value={value}
            onChange={onChange}
            error={errors.menopausalStatus?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="pregnancies"
        render={({ field: { value, onChange, onBlur } }) => (
          <NumberInput
            label={label("pregnancies", "Pregnancies")}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.pregnancies?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="liveBirths"
        render={({ field: { value, onChange, onBlur } }) => (
          <NumberInput
            label={label("live_births", "Live births")}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.liveBirths?.message}
          />
        )}
      />
      {births > 0 ? (
        <Controller
          control={control}
          name="ageAtFirstBirth"
          render={({ field: { value, onChange, onBlur } }) => (
            <NumberInput
              label="Age at first birth"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.ageAtFirstBirth?.message}
            />
          )}
        />
      ) : null}

      <Controller
        control={control}
        name="breastfeeding"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label={label("breastfeeding", "Breastfeeding")}
            options={opts("breastfeeding", YES_NO_OPTIONS)}
            value={value}
            onChange={onChange}
            error={errors.breastfeeding?.message}
          />
        )}
      />
      {breastfeeding === "yes" ? (
        <Controller
          control={control}
          name="breastfeedingMonths"
          render={({ field: { value, onChange, onBlur } }) => (
            <NumberInput
              label="Months of breastfeeding"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.breastfeedingMonths?.message}
            />
          )}
        />
      ) : null}

      <Controller
        control={control}
        name="estrogenConditions"
        render={({ field: { value, onChange } }) => (
          <CheckboxGroup
            label={label(
              "estrogen_conditions",
              "Have you been told you have any of these?",
            )}
            options={opts("estrogen_conditions", ESTROGEN_CONDITION_OPTIONS)}
            values={value}
            onChange={onChange}
            exclusiveValue="none"
            error={errors.estrogenConditions?.message}
          />
        )}
      />

    </SectionScaffold>
  );
}
