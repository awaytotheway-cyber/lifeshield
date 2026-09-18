import { zodResolver } from "@hookform/resolvers/zod";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Text, TextInput, View } from "react-native";

import { ClinicalTerm } from "@/components/ClinicalTerm";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { SelectPicker } from "@/components/ui/SelectPicker";
import { TextField } from "@/components/ui/TextField";
import { isAdminEmail } from "@/lib/constants";
import { COPY } from "@/lib/copy";
import {
  emptyResultEntry,
  formFromCsvRow,
  parseResultCsv,
  plainNameForTerm,
  recordFromParsed,
  RESULT_ENTRY_TEST_OPTIONS,
  RESULT_FLAG_OPTIONS,
  resultEntrySchema,
  saveReviewedResult,
  type ResultEntryForm,
  type ResultEntryParsed,
} from "@/lib/result-entry";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

export default function EnterResultsScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formOk, setFormOk] = useState(false);
  const [savedForSelf, setSavedForSelf] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvBusy, setCsvBusy] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResultEntryForm, unknown, ResultEntryParsed>({
    resolver: zodResolver(resultEntrySchema),
    defaultValues: emptyResultEntry(session?.user.id ?? ""),
  });

  const selectedTest = useWatch({ control, name: "test_name" });

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    reset((current) => ({
      ...current,
      user_id: current.user_id || session.user.id,
    }));
  }, [session?.user.id, reset]);

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  const isAdmin = isAdminEmail(session.user.email);

  if (!isAdmin) {
    return (
      <Screen scroll>
        <Text className="text-center text-2xl text-charcoal">
          {COPY.enterResultsTitle}
        </Text>
        <Text className="mt-4 text-center text-charcoal">
          {COPY.enterResultsDenied}
        </Text>
        <Button
          title={COPY.enterResultsGoHome}
          onPress={() => {
            router.replace(routes.home);
          }}
        />
      </Screen>
    );
  }

  const onSubmit = handleSubmit(
    async (values) => {
      setFormOk(false);
      setSavedForSelf(false);
      setFormMessage(null);
      try {
        const result = await saveReviewedResult(
          recordFromParsed(values),
          session.user.email,
        );
        setFormOk(result.ok);
        const ownRow = values.user_id === session.user.id;
        setSavedForSelf(result.ok && ownRow);
        setFormMessage(
          result.ok
            ? ownRow
              ? (result.message ?? COPY.enterResultsSaved)
              : COPY.enterResultsSavedOtherUser
            : (result.message ?? COPY.enterResultsSaveFailed),
        );
        if (result.ok) {
          reset(
            emptyResultEntry(values.user_id || session.user.id),
          );
        }
      } catch {
        setFormOk(false);
        setSavedForSelf(false);
        setFormMessage(COPY.enterResultsSaveFailed);
      }
    },
    () => {
      setFormOk(false);
      setFormMessage(COPY.enterResultsNeedFix);
    },
  );

  const onImportCsv = async () => {
    setCsvBusy(true);
    setFormOk(false);
    setSavedForSelf(false);
    setFormMessage(null);
    try {
      const parsed = parseResultCsv(csvText);
      if (parsed.error || parsed.rows.length === 0) {
        setFormMessage(parsed.error ?? COPY.enterResultsCsvEmpty);
        return;
      }

      let saved = 0;
      let lastError: string | null = null;
      for (const row of parsed.rows) {
        const form = formFromCsvRow(row, session.user.id);
        const checked = resultEntrySchema.safeParse(form);
        if (!checked.success) {
          lastError =
            checked.error.issues[0]?.message ?? COPY.enterResultsNeedFix;
          continue;
        }
        const result = await saveReviewedResult(
          recordFromParsed(checked.data),
          session.user.email,
        );
        if (result.ok) {
          saved += 1;
        } else {
          lastError = result.message ?? COPY.enterResultsSaveFailed;
          if (result.notDeployed) {
            setFormMessage(COPY.enterResultsNotDeployed);
            return;
          }
        }
      }

      if (saved === parsed.rows.length) {
        setFormOk(true);
        setSavedForSelf(true);
        setFormMessage(
          `${COPY.enterResultsSaved} Saved ${saved} row${saved === 1 ? "" : "s"}.`,
        );
        setCsvText("");
      } else if (saved > 0) {
        setFormOk(false);
        setFormMessage(
          `${COPY.enterResultsCsvPartial} Saved ${saved} of ${parsed.rows.length}. ${lastError ?? ""}`.trim(),
        );
      } else {
        setFormOk(false);
        setFormMessage(lastError ?? COPY.enterResultsSaveFailed);
      }
    } catch {
      setFormOk(false);
      setFormMessage(COPY.enterResultsSaveFailed);
    } finally {
      setCsvBusy(false);
    }
  };

  return (
    <Screen scroll>
      <Text className="text-center text-2xl text-charcoal">
        {COPY.enterResultsTitle}
      </Text>
      <Text className="mt-3 text-center text-charcoal">
        {COPY.enterResultsBody}
      </Text>
      <Text className="mt-3 text-center text-sm text-teal">
        Signed in as {session.user.email}. For founder testing, leave the user
        id as your own so a row appears for you.
      </Text>

      <Controller
        control={control}
        name="test_name"
        render={({ field: { value, onChange } }) => (
          <SelectPicker
            label={COPY.enterResultsTestLabel}
            options={RESULT_ENTRY_TEST_OPTIONS}
            value={value}
            onChange={(next) => {
              onChange(next);
              if (next) {
                setValue("plain_name", plainNameForTerm(next));
              }
            }}
            error={errors.test_name?.message}
          />
        )}
      />

      {selectedTest ? <ClinicalTerm termKey={selectedTest} /> : null}

      <Controller
        control={control}
        name="plain_name"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label="Everyday name (filled in for you)"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.plain_name?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="result_value"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={COPY.enterResultsValueLabel}
            hint={COPY.enterResultsValueHint}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.result_value?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="result_unit"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={COPY.enterResultsUnitLabel}
            hint={COPY.enterResultsUnitHint}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.result_unit?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="reference_range"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={COPY.enterResultsRangeLabel}
            hint={COPY.enterResultsRangeHint}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.reference_range?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="flag"
        render={({ field: { value, onChange } }) => (
          <SelectPicker
            label={COPY.enterResultsFlagLabel}
            options={[...RESULT_FLAG_OPTIONS]}
            value={value}
            onChange={onChange}
            error={errors.flag?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="user_id"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={COPY.enterResultsUserIdLabel}
            hint={COPY.enterResultsUserIdHint}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="none"
            error={errors.user_id?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="test_order_id"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={COPY.enterResultsOrderIdLabel}
            hint={COPY.enterResultsOrderIdHint}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="none"
            error={errors.test_order_id?.message}
          />
        )}
      />

      {formMessage ? (
        <Text
          className={`mt-4 text-center ${formOk ? "text-teal" : "text-coral"}`}
        >
          {formMessage}
        </Text>
      ) : null}

      <Button
        title={COPY.enterResultsSave}
        loading={isSubmitting}
        onPress={() => {
          void onSubmit();
        }}
      />

      <View className="mt-8">
        <Text className="text-center text-xl text-charcoal">
          {COPY.enterResultsCsvTitle}
        </Text>
        <Text className="mt-2 text-center text-sm text-teal">
          {COPY.enterResultsCsvHint}
        </Text>
        <TextInput
          className="mt-3 min-h-[120px] rounded-xl border border-sage bg-white px-4 py-3 text-charcoal"
          placeholderTextColor="#8C878199"
          multiline
          textAlignVertical="top"
          value={csvText}
          onChangeText={setCsvText}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Button
          title={COPY.enterResultsCsvImport}
          variant="ghost"
          loading={csvBusy}
          onPress={() => {
            void onImportCsv();
          }}
        />
      </View>

      {formOk && savedForSelf ? (
        <Button
          title={COPY.enterResultsViewDashboard}
          onPress={() => {
            router.push(routes.labResults);
          }}
        />
      ) : null}

      <Button
        title={COPY.resultsBackHome}
        variant="ghost"
        onPress={() => {
          router.replace(routes.home);
        }}
      />
    </Screen>
  );
}
