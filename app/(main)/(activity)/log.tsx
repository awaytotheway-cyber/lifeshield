import { Redirect, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { IconButton, PrimaryButton, TextButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { TextInput } from "@/components/ui/TextInput";
import { TwoTone, type TwoTonePart } from "@/components/ui/TwoTone";
import {
  ALL_KINDS,
  CANONICAL_UNIT,
  KIND_LABELS,
  validateManualDraft,
  type ActivityKind,
} from "@/lib/activity";
import { upsertSnapshot } from "@/lib/activity-io";
import { colors, radius, spacing, tapTarget } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { fontFamily, typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";

/** The one headline on the screen. */
const HEADLINE: TwoTonePart[] = [
  { text: "Log", tone: "bold" },
  { text: " a ", tone: "grey" },
  { text: "reading", tone: "bold" },
];

/** Where the form came from, as the micro eyebrow beside the way back. */
const EYEBROW = "Activity";

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
    <Screen scroll contentPadding={spacing.screenX} centered={false}>
      <View style={styles.topRow}>
        <IconButton
          icon="arrow-left"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          // Pulled out to the gutter so the glyph, not its 44pt hit area,
          // lines up with the headline under it.
          style={styles.back}
        />
        <Text style={styles.eyebrow}>{EYEBROW}</Text>
      </View>

      <View accessibilityRole="header" style={styles.headline}>
        <TwoTone size="l" parts={HEADLINE} />
      </View>

      <Text style={styles.label}>What are you logging?</Text>
      {/*
        Built to the same rule as the other choice controls: each option is a
        target at `radius.control`, and the chosen one is filled with
        `mossTint` and carries weight as well as colour. White is the
        unselected fill because these sit on the paper ground, where a bare
        chip would have no edge at all.
      */}
      <View style={styles.chipRow}>
        {ALL_KINDS.map((option) => {
          const active = option === kind;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={KIND_LABELS[option]}
              onPress={() => {
                setKind(option);
                setFieldError(null);
              }}
              style={({ pressed }) => [
                styles.chip,
                pressed && !active ? styles.chipPressed : null,
                active ? styles.chipActive : null,
              ]}
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
        hint={helperText}
        error={fieldError?.field === "value" ? fieldError.message : undefined}
      />

      <TextInput
        label="Date"
        placeholder="YYYY-MM-DD"
        value={recordedAt}
        onChangeText={setRecordedAt}
        error={
          fieldError?.field === "recorded_at" ? fieldError.message : undefined
        }
      />

      {/*
        Stacked, not side by side: both buttons are full width by design, so a
        row of two overflowed the gutter. Save is the screen's one ink button
        and Cancel is the underlined link under it.
      */}
      <PrimaryButton title="Save" loading={saving} onPress={onSave} />
      <TextButton title="Cancel" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: {
    marginLeft: -12,
  },
  eyebrow: {
    ...typography.micro,
    color: colors.inkMuted,
  },
  headline: {
    marginTop: 8,
  },
  label: {
    marginTop: 24,
    ...typography.label,
    color: colors.inkSoft,
  },
  chipRow: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  // The 52pt of the full-width choice rows would run a wrapped row of five
  // to three deep, so these keep to the 44pt floor instead.
  chip: {
    minHeight: tapTarget,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: radius.control,
    backgroundColor: colors.white,
  },
  chipPressed: {
    backgroundColor: colors.paper,
  },
  chipActive: {
    backgroundColor: colors.mossTint,
  },
  chipLabel: {
    ...typography.body,
    color: colors.inkSoft,
  },
  // The chosen chip carries weight as well as fill, so the answer is not told
  // by colour alone.
  chipLabelActive: {
    fontFamily: fontFamily.bodySemi,
    color: colors.ink,
  },
});
