import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { Text, View } from "react-native";

import { SectionScaffold } from "@/components/questionnaire/SectionScaffold";
import { SymptomInterrupt } from "@/components/questionnaire/SymptomInterrupt";
import { Button } from "@/components/ui/Button";
import { NumberInput } from "@/components/ui/NumberInput";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { SelectPicker } from "@/components/ui/SelectPicker";
import { FAMILY_RELATIONSHIP_OPTIONS, YES_NO_OPTIONS } from "@/lib/constants";
import { COPY } from "@/lib/copy";
import {
  familyHistoryToJson,
  interruptClearedFromJson,
  jsonToFamilyHistoryForm,
} from "@/lib/questionnaire/mappers";
import {
  emptyFamilyHistory,
  familyHistorySchema,
  type FamilyHistoryForm,
  type FamilyHistoryParsed,
} from "@/lib/questionnaire/schemas";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { useTriageStore } from "@/stores/triage-store";

export default function FamilyHistoryScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const loadSection = useQuestionnaireStore((state) => state.loadSection);
  const saveSection = useQuestionnaireStore((state) => state.saveSection);
  const lockFromInterrupt = useTriageStore((state) => state.lockFromInterrupt);
  const [ready, setReady] = useState(false);
  const [showInterrupt, setShowInterrupt] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [parsedCache, setParsedCache] = useState<FamilyHistoryParsed | null>(
    null,
  );
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [interruptError, setInterruptError] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FamilyHistoryForm, unknown, FamilyHistoryParsed>({
    resolver: zodResolver(familyHistorySchema),
    defaultValues: emptyFamilyHistory(),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "breastRelatives",
  });

  const breastCancer = useWatch({ control, name: "breastCancer" });
  const ovarianCancer = useWatch({ control, name: "ovarianCancer" });
  const colonCancer = useWatch({ control, name: "colonCancer" });
  const melanoma = useWatch({ control, name: "melanoma" });

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await loadSection(session.user.id, "family_history");
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setLoadMessage(result.message ?? COPY.sectionLoadFailed);
      } else {
        reset(jsonToFamilyHistoryForm(result.responses));
        if (result.responses && !interruptClearedFromJson(result.responses)) {
          setShowInterrupt(true);
        }
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id, loadSection, reset]);

  const persist = async (
    parsed: FamilyHistoryParsed,
    interruptCleared: boolean,
  ) => {
    if (!session?.user.id) {
      return { ok: false as const, message: COPY.sectionSaveFailed };
    }
    return saveSection(
      session.user.id,
      "family_history",
      familyHistoryToJson(parsed, interruptCleared),
    );
  };

  const onSubmit = handleSubmit(async (values) => {
    setSaveMessage(null);
    const result = await persist(values, false);
    if (!result.ok) {
      setSaveMessage(result.message ?? COPY.sectionSaveFailed);
      return;
    }
    setParsedCache(values);
    setShowComplete(true);
  });

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
      let parsed = parsedCache;
      if (!parsed) {
        const loaded = await loadSection(session.user.id, "family_history");
        const form = jsonToFamilyHistoryForm(loaded.responses);
        const again = familyHistorySchema.safeParse(form);
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
      router.replace(routes.qPersonal);
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

  return (
    <SectionScaffold
      title="Family history"
      step={5}
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
        <Text className="mt-3 text-center text-coral">{loadMessage}</Text>
      ) : null}

      <Controller
        control={control}
        name="breastCancer"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Breast cancer in the family?"
            options={YES_NO_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.breastCancer?.message}
            whyAsk={COPY.whyAskFamily}
          />
        )}
      />
      {breastCancer === "yes" ? (
        <View className="mt-2">
          {errors.breastRelatives?.message ? (
            <Text className="text-coral">{String(errors.breastRelatives.message)}</Text>
          ) : null}
          {fields.map((field, index) => (
            <View key={field.id} className="mt-3 rounded-xl bg-white px-4 py-3">
              <Text className="text-charcoal">
                {COPY.familyRelativeLabel} {index + 1}
              </Text>
              <Controller
                control={control}
                name={`breastRelatives.${index}.relationship`}
                render={({ field: { value, onChange } }) => (
                  <SelectPicker
                    label="Relationship"
                    options={FAMILY_RELATIONSHIP_OPTIONS}
                    value={value}
                    onChange={onChange}
                  />
                )}
              />
              <Controller
                control={control}
                name={`breastRelatives.${index}.ageAtDiagnosis`}
                render={({ field: { value, onChange, onBlur } }) => (
                  <NumberInput
                    label={COPY.familyAgeLabel}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                  />
                )}
              />
              {fields.length > 1 ? (
                <Button
                  title={COPY.removeRelative}
                  variant="ghost"
                  onPress={() => remove(index)}
                />
              ) : null}
            </View>
          ))}
          <Button
            title={COPY.addRelative}
            variant="ghost"
            onPress={() =>
              append({ relationship: "", ageAtDiagnosis: "" })
            }
          />
        </View>
      ) : null}

      <Controller
        control={control}
        name="ovarianCancer"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Ovarian cancer in the family?"
            options={YES_NO_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.ovarianCancer?.message}
          />
        )}
      />
      {ovarianCancer === "yes" ? (
        <Controller
          control={control}
          name="ovarianRelationship"
          render={({ field: { value, onChange } }) => (
            <SelectPicker
              label="Relationship"
              options={FAMILY_RELATIONSHIP_OPTIONS}
              value={value}
              onChange={onChange}
              error={errors.ovarianRelationship?.message}
            />
          )}
        />
      ) : null}

      <Controller
        control={control}
        name="colonCancer"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Colon cancer in the family?"
            options={YES_NO_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.colonCancer?.message}
          />
        )}
      />
      {colonCancer === "yes" ? (
        <Controller
          control={control}
          name="colonRelationship"
          render={({ field: { value, onChange } }) => (
            <SelectPicker
              label="Relationship"
              options={FAMILY_RELATIONSHIP_OPTIONS}
              value={value}
              onChange={onChange}
              error={errors.colonRelationship?.message}
            />
          )}
        />
      ) : null}

      <Controller
        control={control}
        name="melanoma"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Melanoma in the family?"
            options={YES_NO_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.melanoma?.message}
          />
        )}
      />
      {melanoma === "yes" ? (
        <Controller
          control={control}
          name="melanomaRelationship"
          render={({ field: { value, onChange } }) => (
            <SelectPicker
              label="Relationship"
              options={FAMILY_RELATIONSHIP_OPTIONS}
              value={value}
              onChange={onChange}
              error={errors.melanomaRelationship?.message}
            />
          )}
        />
      ) : null}

    </SectionScaffold>
  );
}
