import { Redirect, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { TextInput } from "@/components/ui/TextInput";
import {
  ALL_KINDS,
  CANONICAL_UNIT,
  KIND_LABELS,
  validateManualDraft,
  type ActivityKind,
} from "@/lib/activity";
import { upsertSnapshot } from "@/lib/activity-io";
import { colors, radius, spacing } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";

function todayYmd(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function LogActivityScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const userId = session?.user.id ?? null;

  const [kind, setKind] = useState<ActivityKind>("steps");
  const [value, setValue] = useState("");
  const [recordedAt, setRecordedAt] = useState(todayYmd());
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<{
    field: "value" | "recorded_at" | "kind";
    message: string;
  } | null>(null);

  const helperText = useMemo(() => {
    switch (kind) {
      case "steps":
        return "Count from your phone or watch. Whole numbers, no comma.";
      case "active_minutes":
        return "Minutes at moderate-to-vigorous intensity today.";
      case "resting_heart_rate":
        return "Beats per minute, measured while resting (bpm).";
      case "sleep_minutes":
        return "Total sleep in minutes — e.g. 7 hours = 420.";
      case "weight_kg":
        return "Kilograms, one decimal is fine.";
      default:
        return "";
    }
  }, [kind]);

  if (!session) return <Redirect href={routes.login} />;

  async function onSave() {
    if (!userId) return;
    setFieldError(null);
    const validated = validateManualDraft({
      kind,
      value,
      recorded_at: recordedAt,
    });
    if (!validated.ok) {
      const first = validated.errors[0];
      setFieldError({
        field: first.field as "value" | "recorded_at" | "kind",
        message: first.message,
      });
      return;
    }
    setSaving(true);
    const outcome = await upsertSnapshot(userId, {
      kind,
      value: validated.value,
      unit: CANONICAL_UNIT[kind],
      source: "manual",
      recorded_at: validated.recorded_at,
    });
    setSaving(false);
    if (!outcome.ok) {
      Alert.alert("Couldn't save reading", outcome.message);
      return;
    }
    router.back();
  }

  return (
    <Screen scroll>
      <ScreenHeader title="Log a reading" onBack={() => router.back()} />

      <Text style={styles.label}>What are you logging?</Text>
      <View style={styles.chipRow}>
        {ALL_KINDS.map((option) => {
          const active = option === kind;
          return (
            <Pressable
              key={option}
              onPress={() => {
                setKind(option);
                setFieldError(null);
              }}
              style={[styles.chip, active ? styles.chipActive : null]}
            >
              <Text
                style={[
                  styles.chipLabel,
                  active ? styles.chipLabelActive : null,
                ]}
              >
                {KIND_LABELS[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        label={`${KIND_LABELS[kind]} (${CANONICAL_UNIT[kind]})`}
        placeholder="0"
        keyboardType="numeric"
        value={value}
        onChangeText={setValue}
        error={fieldError?.field === "value" ? fieldError.message : undefined}
      />
      <Text style={styles.helper}>{helperText}</Text>

      <TextInput
        label="Date"
        placeholder="YYYY-MM-DD"
        value={recordedAt}
        onChangeText={setRecordedAt}
        error={
          fieldError?.field === "recorded_at" ? fieldError.message : undefined
        }
      />

      <View style={styles.actions}>
        <SecondaryButton title="Cancel" onPress={() => router.back()} />
        <PrimaryButton title="Save" loading={saving} onPress={onSave} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    color: colors.deepNavy,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  helper: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.slate,
    marginTop: -spacing.micro,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.micro,
  },
  chip: {
    borderRadius: radius.chip,
    paddingHorizontal: spacing.mdSm,
    paddingVertical: spacing.micro,
    backgroundColor: colors.glassChrome,
  },
  chipActive: { backgroundColor: colors.primaryBlue },
  chipLabel: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    color: colors.deepNavy,
  },
  chipLabelActive: { color: colors.white },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
