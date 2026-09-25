import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import {
  DangerButton,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { TextInput } from "@/components/ui/TextInput";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import {
  validateMedicationDraft,
  type MedicationDraft,
} from "@/lib/supplements";
import {
  deleteMedication,
  loadOwnMedications,
  updateMedication,
  type MedicationRow,
} from "@/lib/supplements-io";
import { fontFamily } from "@/lib/typography";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";

type LoadState = "idle" | "loading" | "ready" | "error";

function parseCodes(raw: string): string[] {
  return raw
    .split(/[,\n]+/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export default function MedicationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const session = useAuthStore((state) => state.session);
  const userId = session?.user.id ?? null;
  const medicationId = typeof id === "string" ? id.trim() : "";

  const [state, setState] = useState<LoadState>("idle");
  const [row, setRow] = useState<MedicationRow | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [codes, setCodes] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    if (!userId || !medicationId) return;
    setState("loading");
    setErrorMessage(null);
    // No single-row loader — list all and pick the one we navigated to.
    // RLS restricts the list to the caller; Phase E volumes are tiny.
    const outcome = await loadOwnMedications(userId);
    if (!outcome.ok) {
      setErrorMessage(outcome.message);
      setState("error");
      return;
    }
    const found = outcome.rows.find((r) => r.id === medicationId) ?? null;
    if (!found) {
      setErrorMessage("This medication wasn't found. It may have been deleted.");
      setState("error");
      return;
    }
    setRow(found);
    setName(found.name);
    setDosage(found.dosage ?? "");
    setFrequency(found.frequency ?? "");
    setStartDate(found.start_date ?? "");
    setEndDate(found.end_date ?? "");
    setNotes(found.notes ?? "");
    setCodes(found.contraindication_codes.join(", "));
    setActive(found.active);
    setState("ready");
  }, [userId, medicationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!session) return <Redirect href={routes.login} />;
  if (!medicationId) return <Redirect href={routes.medications} />;

  async function onSave() {
    if (!row) return;
    const draft: MedicationDraft = {
      name: name.trim(),
      dosage: dosage.trim() || null,
      frequency: frequency.trim() || null,
      start_date: startDate.trim() || null,
      end_date: endDate.trim() || null,
      notes: notes.trim() || null,
      contraindication_codes: parseCodes(codes),
      active,
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
    const outcome = await updateMedication(row.id, draft);
    setSaving(false);
    if (!outcome.ok) {
      Alert.alert("Couldn't save medication", outcome.message);
      return;
    }
    setRow(outcome.row);
  }

  async function onDelete() {
    if (!row || busy) return;
    Alert.alert(
      "Delete this medication?",
      "It won't count toward contraindication warnings anymore.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            const outcome = await deleteMedication(row.id);
            setBusy(false);
            if (!outcome.ok) {
              Alert.alert("Couldn't delete", outcome.message);
              return;
            }
            router.replace(routes.medications);
          },
        },
      ],
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader
        title="Medication"
        onBack={() => router.replace(routes.medications)}
      />

      {state === "loading" ? (
        <ActivityIndicator color={colors.primaryBlue} style={styles.spinner} />
      ) : null}

      {state === "error" && errorMessage ? (
        <GlassCard intensity="card" style={styles.errorCard}>
          <Text style={styles.errorHeading}>Couldn't open this medication</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
          <SecondaryButton title="Try again" onPress={() => void refresh()} />
        </GlassCard>
      ) : null}

      {state === "ready" && row ? (
        <>
          <TextInput
            label="Name"
            value={name}
            onChangeText={setName}
            error={errors["name"]}
          />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <TextInput
                label="Dosage"
                value={dosage}
                onChangeText={setDosage}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                label="Frequency"
                value={frequency}
                onChangeText={setFrequency}
              />
            </View>
          </View>
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
                label="End date"
                placeholder="YYYY-MM-DD"
                value={endDate}
                onChangeText={setEndDate}
                error={errors["end_date"]}
              />
            </View>
          </View>
          <TextInput
            label="Interaction tags"
            value={codes}
            onChangeText={setCodes}
            hint="Comma-separated tags matched against supplement contraindications."
          />
          <TextInput label="Notes" value={notes} onChangeText={setNotes} />

          <View style={styles.activeRow}>
            <Text style={styles.activeLabel}>Active</Text>
            <Switch value={active} onValueChange={setActive} />
          </View>

          <View style={styles.spacer} />
          <PrimaryButton
            title="Save changes"
            loading={saving}
            onPress={onSave}
          />
          <DangerButton
            title="Delete"
            disabled={busy}
            onPress={onDelete}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  spinner: { marginTop: spacing.md },
  errorCard: {
    marginTop: spacing.md,
    padding: spacing.base,
    borderRadius: radius.card,
    ...shadows.card,
  },
  errorHeading: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 16,
    color: colors.riskHigh,
    marginBottom: spacing.micro,
  },
  errorBody: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.slate,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  activeLabel: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    color: colors.deepNavy,
  },
  spacer: { height: spacing.md },
});
