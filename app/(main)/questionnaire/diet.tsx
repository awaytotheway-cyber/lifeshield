import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text } from "react-native";

import {
  CustomFields,
  useCustomAnswers,
} from "@/components/questionnaire/CustomFields";
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
import { resolveLabel, resolveOptionLabel } from "@/lib/app-content";
import { useAppContent } from "@/lib/content-context";
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
  const content = useAppContent();
  const custom = useCustomAnswers();
  const SECTION = "diet_environment";
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
      "diet_environment",
      {
        ...dietEnvironmentToJson(values),
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
            label={label("canned_food", "Canned / tinned food")}
            options={opts("canned_food", FOOD_FREQUENCY_OPTIONS)}
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
            label={label("packaged_food", "Packaged / processed food")}
            options={opts("packaged_food", FOOD_FREQUENCY_OPTIONS)}
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
            label={label("takeaway", "Takeaway")}
            options={opts("takeaway", FOOD_FREQUENCY_OPTIONS)}
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
            label={label("microwave", "Microwave use")}
            options={opts("microwave", SOMETIMES_FREQUENCY_OPTIONS)}
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
            label={label("plastic", "Plastic containers / wrap")}
            options={opts("plastic", SOMETIMES_FREQUENCY_OPTIONS)}
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
            label={label("suncream", "Suncream")}
            options={opts("suncream", SUNCREAM_OPTIONS)}
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
            label={label("nail_varnish", "Nail varnish / gels")}
            options={opts("nail_varnish", NAIL_VARNISH_OPTIONS)}
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
            label={label("iodine_sources", COPY.iodineSourcesLabel)}
            options={opts("iodine_sources", IODINE_SOURCE_OPTIONS)}
            values={value}
            onChange={onChange}
            error={errors.iodineSources?.message}
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
