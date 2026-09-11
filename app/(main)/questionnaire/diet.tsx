import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text } from "react-native";

import { SectionScaffold } from "@/components/questionnaire/SectionScaffold";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { RadioGroup } from "@/components/ui/RadioGroup";
import {
  COSMETICS_OPTIONS,
  FOOD_FREQUENCY_OPTIONS,
  IODINE_SOURCE_OPTIONS,
  NAIL_VARNISH_OPTIONS,
  SOMETIMES_FREQUENCY_OPTIONS,
  SUNCREAM_OPTIONS,
} from "@/lib/constants";
import { COPY } from "@/lib/copy";
import {
  dietEnvironmentToJson,
  jsonToDietEnvironmentForm,
} from "@/lib/questionnaire/mappers";
import {
  dietEnvironmentSchema,
  emptyDietEnvironment,
  type DietEnvironmentForm,
  type DietEnvironmentParsed,
} from "@/lib/questionnaire/schemas";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";

export default function DietEnvironmentScreen() {
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
  } = useForm<DietEnvironmentForm, unknown, DietEnvironmentParsed>({
    resolver: zodResolver(dietEnvironmentSchema),
    defaultValues: emptyDietEnvironment(),
  });

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await loadSection(session.user.id, "diet_environment");
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        setLoadMessage(result.message ?? COPY.sectionLoadFailed);
      } else {
        reset(jsonToDietEnvironmentForm(result.responses));
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
      "diet_environment",
      dietEnvironmentToJson(values),
    );
    if (!result.ok) {
      setSaveMessage(result.message ?? COPY.sectionSaveFailed);
      return;
    }
    setShowComplete(true);
  });

  return (
    <SectionScaffold
      title="Diet & environment"
      step={9}
      loading={!ready}
      footerTitle={COPY.sectionSave}
      onFooterPress={() => void onSubmit()}
      footerLoading={isSubmitting}
      footerDisabled={isSubmitting}
      showComplete={showComplete}
      onCompleteDone={() => router.replace(routes.qPriorScreening)}
      errorMessage={saveMessage}
    >
      {loadMessage ? (
        <Text className="mt-3 text-center text-coral">{loadMessage}</Text>
      ) : null}

      <Controller
        control={control}
        name="cannedFood"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Canned / tinned food"
            options={FOOD_FREQUENCY_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.cannedFood?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="packagedFood"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Packaged / processed food"
            options={FOOD_FREQUENCY_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.packagedFood?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="takeaway"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Takeaway"
            options={FOOD_FREQUENCY_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.takeaway?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="microwave"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Microwave use"
            options={SOMETIMES_FREQUENCY_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.microwave?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="plastic"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Plastic containers / wrap"
            options={SOMETIMES_FREQUENCY_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.plastic?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="suncream"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Suncream"
            options={SUNCREAM_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.suncream?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="nailVarnish"
        render={({ field: { value, onChange } }) => (
          <RadioGroup
            label="Nail varnish / gels"
            options={NAIL_VARNISH_OPTIONS}
            value={value}
            onChange={onChange}
            error={errors.nailVarnish?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="cosmetics"
        render={({ field: { value, onChange } }) => (
          <CheckboxGroup
            label="Other cosmetics (choose all that apply)"
            options={COSMETICS_OPTIONS}
            values={value}
            onChange={onChange}
            error={errors.cosmetics?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="iodineSources"
        render={({ field: { value, onChange } }) => (
          <CheckboxGroup
            label={COPY.iodineSourcesLabel}
            options={IODINE_SOURCE_OPTIONS}
            values={value}
            onChange={onChange}
            error={errors.iodineSources?.message}
          />
        )}
      />

    </SectionScaffold>
  );
}
