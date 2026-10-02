import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { ChoiceCard } from "@/components/ui/ChoiceCard";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { TextInput } from "@/components/ui/TextInput";
import { COPY } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
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

/** One question: a label, then a stack of ChoiceCards — never radio dots. */
function ChoiceGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.choices}>
        {options.map((option) => (
          <ChoiceCard
            key={option.value}
            label={option.label}
            selected={value === option.value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

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
    <Screen
      scroll
      footer={
        <PrimaryButton
          title={COPY.goalsSaveGoal}
          loading={busy}
          style={styles.saveButton}
          onPress={submit}
        />
      }
    >
      <ScreenHeader
        title={COPY.goalsNewCta}
        onBack={() => router.back()}
        backLabel={COPY.goalsTitle}
      />

      <TextInput
        label={COPY.goalsFormTitleLabel}
        placeholder={COPY.goalsFormTitlePlaceholder}
        value={title}
        onChangeText={setTitle}
        autoCapitalize="sentences"
      />

      <ChoiceGroup
        label={COPY.goalsFormTypeLabel}
        options={TYPE_OPTIONS}
        value={goalType}
        onChange={setGoalType}
      />

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

      <ChoiceGroup
        label={COPY.goalsFormDurationLabel}
        options={DURATION_OPTIONS}
        value={duration}
        onChange={setDuration}
      />

      <TextInput
        label={COPY.goalsFormNoteLabel}
        placeholder={COPY.goalsFormNotePlaceholder}
        value={note}
        onChangeText={setNote}
        multiline
        numberOfLines={3}
        autoCapitalize="sentences"
      />

      {message ? <Text style={styles.error}>{message}</Text> : null}

      <TextButton title="Cancel" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: {
    // Section 8: 40px of air between question groups.
    marginTop: Gap.sections,
  },
  groupLabel: {
    ...typeStyle("cardTitle"),
    marginBottom: Space.md - 2,
    color: Colors.ink,
  },
  choices: {
    gap: Space.sm,
  },
  row: {
    flexDirection: "row",
    gap: Space.md,
    marginTop: Gap.sections - Space.lg,
  },
  rowItem: {
    flex: 1,
  },
  error: {
    ...typeStyle("secondary"),
    marginTop: Space.lg,
    color: Colors.red,
  },
  saveButton: {
    marginTop: 0,
  },
});
