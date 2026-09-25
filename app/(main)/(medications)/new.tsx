import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { TextInput } from "@/components/ui/TextInput";
import { colors, spacing } from "@/lib/design-tokens";
import {
  validateMedicationDraft,
  type MedicationDraft,
} from "@/lib/supplements";
import { createMedication } from "@/lib/supplements-io";
import { fontFamily } from "@/lib/typography";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";

function parseCodes(raw: string): string[] {
  return raw
    .split(/[,\n]+/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export default function NewMedicationScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const userId = session?.user.id ?? null;

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [codes, setCodes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!session) return <Redirect href={routes.login} />;

  async function onSave() {
    if (!userId) return;
    const draft: MedicationDraft = {
      name: name.trim(),
      dosage: dosage.trim() || null,
      frequency: frequency.trim() || null,
      start_date: startDate.trim() || null,
      end_date: endDate.trim() || null,
      notes: notes.trim() || null,
      contraindication_codes: parseCodes(codes),
      active: true,
    };
    const validationErrors = validateMedicationDraft(draft);
    if (validationErrors.length > 0) {
      const map: Record<string, string> = {};
      for (const err of validationErrors) map[err.field] = err.message;
      setErrors(map);
      return;
    }
    setErrors({});
    setSaving(true);
    const outcome = await createMedication(userId, draft);
    setSaving(false);
    if (!outcome.ok) {
      Alert.alert("Couldn't save medication", outcome.message);
      return;
    }
    router.back();
  }

  return (
    <Screen scroll>
      <ScreenHeader title="New medication" onBack={() => router.back()} />

      <Text style={styles.helper}>
        Anything you're taking daily or on-and-off. This list stays on
        your account and is used to flag supplement interactions.
      </Text>

      <TextInput
        label="Name"
        placeholder="Vitamin D3, HRT patch, Warfarin…"
        value={name}
        onChangeText={setName}
        error={errors["name"]}
      />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <TextInput
            label="Dosage"
            placeholder="2000 IU, 5 mg…"
            value={dosage}
            onChangeText={setDosage}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextInput
            label="Frequency"
            placeholder="Daily, weekly…"
            value={frequency}
            onChangeText={setFrequency}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <TextInput
            label="Start date (optional)"
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

      <TextInput
        label="Interaction tags"
        placeholder="hormones, blood_thinners"
        value={codes}
        onChangeText={setCodes}
        hint="Comma-separated tags matched against supplement contraindications."
      />

      <TextInput
        label="Notes (optional)"
        placeholder="Anything worth remembering."
        value={notes}
        onChangeText={setNotes}
      />

      <View style={styles.spacer} />
      <PrimaryButton title="Save medication" loading={saving} onPress={onSave} />
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
  spacer: {
    height: spacing.md,
  },
});
