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
  validateReminderDraft,
  type ReminderCadence,
  type ReminderDraft,
  type ReminderSourceKind,
} from "@/lib/reminders";
import { createReminder } from "@/lib/reminders-io";
import { scheduleReminder } from "@/lib/reminders-notifications";
import { fontFamily } from "@/lib/typography";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";

const CADENCE_OPTIONS: { value: ReminderCadence; label: string }[] = [
  { value: "once", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const CADENCE_SET: readonly ReminderCadence[] = [
  "once",
  "daily",
  "weekly",
  "monthly",
];
const SOURCE_KIND_SET: readonly ReminderSourceKind[] = [
  "self",
  "goal",
  "intervention",
  "supplement",
  "test_order",
];

function firstString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/**
 * Suggest tomorrow at 09:00 as the default start_at — most reminders are
 * "remember this thing every morning" and starting one minute from now can
 * lead to a surprise fire before the user has closed the create screen.
 */
function defaultStartAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return isoLocal(d);
}

function isoLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

export default function NewReminderScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);

  const params = useLocalSearchParams<{
    title?: string | string[];
    body?: string | string[];
    cadence?: string | string[];
    start_at?: string | string[];
    source_kind?: string | string[];
    source_ref?: string | string[];
  }>();

  const paramCadence = firstString(params.cadence) as ReminderCadence;
  const paramSourceKind = firstString(params.source_kind) as ReminderSourceKind;
  const paramSourceRef = firstString(params.source_ref);
  const paramStartAt = firstString(params.start_at);

  const initialCadence: ReminderCadence = CADENCE_SET.includes(paramCadence)
    ? paramCadence
    : "daily";
  const sourceKind: ReminderSourceKind = SOURCE_KIND_SET.includes(paramSourceKind)
    ? paramSourceKind
    : "self";
  const sourceRef: string | null =
    sourceKind !== "self" && paramSourceRef.length > 0 ? paramSourceRef : null;

  const [title, setTitle] = useState(firstString(params.title));
  const [body, setBody] = useState(firstString(params.body));
  const [cadence, setCadence] = useState<ReminderCadence>(initialCadence);
  const [startAt, setStartAt] = useState(paramStartAt || defaultStartAt());
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const userId = session?.user.id ?? null;

  const draft = useMemo<ReminderDraft>(() => {
    // Interpret the entered local time as local, then hand a full ISO string
    // to the DB. new Date("YYYY-MM-DDTHH:mm") is parsed as local time.
    const parsed = new Date(startAt);
    return {
      title: title.trim(),
      body: body.trim().length > 0 ? body.trim() : null,
      cadence,
      start_at: Number.isNaN(parsed.getTime())
        ? startAt
        : parsed.toISOString(),
      source_kind: sourceKind,
      source_ref: sourceRef,
    };
  }, [title, body, cadence, startAt, sourceKind, sourceRef]);

  if (!session) return <Redirect href={routes.login} />;

  async function onSave() {
    setSaveError(null);
    const validationErrors = validateReminderDraft(draft);
    if (validationErrors.length > 0) {
      const map: Record<string, string> = {};
      for (const err of validationErrors) map[err.field] = err.message;
      setErrors(map);
      return;
    }
    setErrors({});
    if (!userId) return;
    setSubmitting(true);
    const outcome = await createReminder(userId, draft);
    if (!outcome.ok) {
      setSubmitting(false);
      setSaveError(outcome.message);
      Alert.alert("Couldn't save this reminder", outcome.message);
      return;
    }
    // Best-effort local notification schedule. A failure here shouldn't block
    // the save — the row is already in the DB, and syncLocalReminders on the
    // next app resume will try again.
    await scheduleReminder(outcome.row);
    setSubmitting(false);
    router.back();
  }

  return (
    <Screen scroll>
      <ScreenHeader title="New reminder" onBack={() => router.back()} />

      <Text style={styles.helper}>
        Reminders fire as local notifications on this device. Turn on
        notifications when you save the first one.
      </Text>

      <TextInput
        label="Title"
        placeholder="Take vitamin D"
        value={title}
        onChangeText={setTitle}
        error={errors["title"]}
      />
      <TextInput
        label="Note (optional)"
        placeholder="Anything you want to see in the notification body"
        value={body}
        onChangeText={setBody}
      />

      <ChoiceToggle
        label="Cadence"
        options={CADENCE_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        value={cadence}
        onChange={(next) => setCadence(next as ReminderCadence)}
        error={errors["cadence"]}
        allowClear={false}
      />

      <TextInput
        label="Start"
        placeholder="YYYY-MM-DDTHH:MM"
        value={startAt}
        onChangeText={setStartAt}
        error={errors["start_at"]}
        hint={
          cadence === "once"
            ? "Fires once at this local time."
            : "First fire; the reminder repeats from here."
        }
      />

      {saveError ? <Text style={styles.error}>{saveError}</Text> : null}

      <View style={styles.spacer} />
      <PrimaryButton title="Save reminder" loading={submitting} onPress={onSave} />
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
  error: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.riskHigh,
    marginTop: spacing.sm,
  },
  spacer: {
    height: spacing.md,
  },
});
