import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { ChoiceToggle } from "@/components/ui/ChoiceToggle";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { TextInput } from "@/components/ui/TextInput";
import { COPY } from "@/lib/copy";
import { colors, spacing } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { createGoal, type GoalType } from "@/lib/weekly-goals";
import { useAuthStore } from "@/stores/auth-store";

const TYPE_OPTIONS = [
  { value: "habit", label: COPY.goalsTypeHabit },
  { value: "exercise", label: COPY.goalsTypeExercise },
  { value: "meditation", label: COPY.goalsTypeMeditation },
  { value: "supplement", label: COPY.goalsTypeSupplement },
  { value: "recipe", label: COPY.goalsTypeRecipe },
] as const;

const DURATION_OPTIONS = [
  { value: "7", label: COPY.goalsFormDuration7 },
  { value: "14", label: COPY.goalsFormDuration14 },
  { value: "30", label: COPY.goalsFormDuration30 },
] as const;

export default function NewGoalScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const [title, setTitle] = useState("");
  const [goalType, setGoalType] = useState<string>("habit");
  const [target, setTarget] = useState("3");
  const [unit, setUnit] = useState("");
  const [duration, setDuration] = useState("7");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  const submit = async () => {
    setMessage(null);
    const trimmedTitle = title.trim();
    const trimmedUnit = unit.trim();
    const numericTarget = Number(target);
    if (!trimmedTitle) {
      setMessage("Give your goal a short name.");
      return;
    }
    if (!Number.isFinite(numericTarget) || numericTarget <= 0) {
      setMessage("Target must be a positive number.");
      return;
    }
    if (!trimmedUnit) {
      setMessage("Add a unit (e.g. walks, minutes).");
      return;
    }
    setBusy(true);
    const result = await createGoal({
      user_id: session.user.id,
      title: trimmedTitle,
      goal_type: goalType as GoalType,
      target: numericTarget,
      unit: trimmedUnit,
      duration_days: Number(duration) || 7,
      note: note.trim() || null,
    });
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    router.replace(routes.goals);
  };

  return (
    <Screen scroll contentPadding={spacing.screenX} centered={false}>
      <ScreenHeader
        title={COPY.goalsNewCta}
        onBack={() => router.back()}
        backLabel={COPY.goalsTitle}
      />
      <View style={styles.form}>
        <TextInput
          label={COPY.goalsFormTitleLabel}
          placeholder={COPY.goalsFormTitlePlaceholder}
          value={title}
          onChangeText={setTitle}
          autoCapitalize="sentences"
        />

        <View style={styles.field}>
          <ChoiceToggle
            label={COPY.goalsFormTypeLabel}
            options={TYPE_OPTIONS}
            value={goalType}
            onChange={(next) => setGoalType(next || "habit")}
            allowClear={false}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <TextInput
              label={COPY.goalsFormTargetLabel}
              value={target}
              onChangeText={setTarget}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.rowItem}>
            <TextInput
              label={COPY.goalsFormUnitLabel}
              placeholder={COPY.goalsFormUnitPlaceholder}
              value={unit}
              onChangeText={setUnit}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.field}>
          <ChoiceToggle
            label={COPY.goalsFormDurationLabel}
            options={DURATION_OPTIONS}
            value={duration}
            onChange={(next) => setDuration(next || "7")}
            allowClear={false}
          />
        </View>

        <View style={styles.field}>
          <TextInput
            label={COPY.goalsFormNoteLabel}
            placeholder={COPY.goalsFormNotePlaceholder}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            autoCapitalize="sentences"
          />
        </View>

        {message ? <Text style={styles.error}>{message}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton
            title={COPY.goalsSaveGoal}
            loading={busy}
            onPress={submit}
          />
          <TextButton title="Cancel" onPress={() => router.back()} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  field: {
    marginTop: spacing.base,
  },
  row: {
    flexDirection: "row",
    gap: spacing.mdSm,
    marginTop: spacing.base,
  },
  rowItem: {
    flex: 1,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  error: {
    marginTop: spacing.base,
    fontFamily: fontFamily.body,
    color: colors.riskHighText,
  },
});
