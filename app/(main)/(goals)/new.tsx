import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/ui/Button";
import { ChoiceToggle } from "@/components/ui/ChoiceToggle";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { TextInput } from "@/components/ui/TextInput";
import { colors, spacing } from "@/lib/design-tokens";
import {
  todayYmd,
  validateGoalDraft,
  type GoalCadence,
  type GoalDraft,
  type GoalSourceKind,
} from "@/lib/goals";
import { createGoal } from "@/lib/goals-io";
import { fontFamily } from "@/lib/typography";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";

const CADENCE_OPTIONS: { value: GoalCadence; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "once", label: "One-off" },
];

const CADENCE_SET: readonly GoalCadence[] = ["daily", "weekly", "once"];
const SOURCE_KIND_SET: readonly GoalSourceKind[] = [
  "self",
  "intervention",
  "recommendation",
  "test_result",
];

function firstString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function NewGoalScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);

  // Prefill from deep-link params (e.g. from an intervention detail row).
  // Anything unparseable falls back to the same defaults the empty form uses,
  // so a bad URL never shows the user a broken screen.
  const params = useLocalSearchParams<{
    goal_type?: string | string[];
    title?: string | string[];
    target_value?: string | string[];
    target_unit?: string | string[];
    cadence?: string | string[];
    source_kind?: string | string[];
    source_ref?: string | string[];
  }>();

  const paramCadence = firstString(params.cadence) as GoalCadence;
  const paramSourceKind = firstString(params.source_kind) as GoalSourceKind;
  const paramSourceRef = firstString(params.source_ref);

  const initialCadence: GoalCadence = CADENCE_SET.includes(paramCadence)
    ? paramCadence
    : "daily";
  const sourceKind: GoalSourceKind = SOURCE_KIND_SET.includes(paramSourceKind)
    ? paramSourceKind
    : "self";
  const sourceRef: string | null =
    sourceKind !== "self" && paramSourceRef.length > 0 ? paramSourceRef : null;

  const [goalType, setGoalType] = useState(firstString(params.goal_type));
  const [title, setTitle] = useState(firstString(params.title));
  const [targetValue, setTargetValue] = useState(
    firstString(params.target_value),
  );
  const [targetUnit, setTargetUnit] = useState(firstString(params.target_unit));
  const [cadence, setCadence] = useState<GoalCadence>(initialCadence);
  const [startDate, setStartDate] = useState(todayYmd());
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const userId = session?.user.id ?? null;

  const draft = useMemo<GoalDraft>(
    () => ({
      goal_type: goalType.trim(),
      title: title.trim(),
      target: {
        value: Number(targetValue),
        unit: targetUnit.trim(),
        cadence,
      },
      start_date: startDate,
      end_date: endDate.trim().length > 0 ? endDate.trim() : null,
      source_kind: sourceKind,
      source_ref: sourceRef,
    }),
    [
      goalType,
      title,
      targetValue,
      targetUnit,
      cadence,
      startDate,
      endDate,
      sourceKind,
      sourceRef,
    ],
  );

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  async function onSave() {
    setSaveError(null);
    const validationErrors = validateGoalDraft(draft);
    if (validationErrors.length > 0) {
      const map: Record<string, string> = {};
      for (const err of validationErrors) map[err.field] = err.message;
      setErrors(map);
      return;
    }
    setErrors({});
    if (!userId) return;
    setSubmitting(true);
    const outcome = await createGoal(userId, draft);
    setSubmitting(false);
    if (outcome.ok) {
      router.back();
      return;
    }
    setSaveError(outcome.message);
    Alert.alert("Couldn't save this goal", outcome.message);
  }

  return (
    <Screen scroll>
      <ScreenHeader title="New goal" onBack={() => router.back()} />

      <Text style={styles.helper}>
        A goal should be Specific, Measurable, Achievable, Relevant, and
        Time-bound. Keep the target small enough that hitting it feels normal
        by the end of the first week.
      </Text>

      <TextInput
        label="Type"
        placeholder="steps, sleep, veg servings…"
        value={goalType}
        onChangeText={setGoalType}
        error={errors["goal_type"]}
      />
      <TextInput
        label="Title"
        placeholder="Walk 10,000 steps a day"
        value={title}
        onChangeText={setTitle}
        error={errors["title"]}
      />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <TextInput
            label="Target"
            placeholder="10000"
            keyboardType="numeric"
            value={targetValue}
            onChangeText={setTargetValue}
            error={errors["target.value"]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextInput
            label="Unit"
            placeholder="steps"
            value={targetUnit}
            onChangeText={setTargetUnit}
            error={errors["target.unit"]}
          />
        </View>
      </View>

      <ChoiceToggle
        label="Cadence"
        options={CADENCE_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        value={cadence}
        onChange={(next) => setCadence(next as GoalCadence)}
        error={errors["target.cadence"]}
        allowClear={false}
      />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <TextInput
            label="Start date"
            placeholder="YYYY-MM-DD"
            value={startDate}
            onChangeText={setStartDate}
            error={errors["start_date"]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextInput
            label="End date (optional)"
            placeholder="YYYY-MM-DD"
            value={endDate}
            onChangeText={setEndDate}
            error={errors["end_date"]}
          />
        </View>
      </View>

      {saveError ? <Text style={styles.error}>{saveError}</Text> : null}

      <PrimaryButton title="Save goal" loading={submitting} onPress={onSave} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  helper: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.slate,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  error: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.riskHigh,
    marginTop: spacing.sm,
  },
});
