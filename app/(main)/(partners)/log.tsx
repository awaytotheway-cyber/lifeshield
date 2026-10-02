import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ChoiceToggle } from "@/components/ui/ChoiceToggle";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { TextInput } from "@/components/ui/TextInput";
import { COPY } from "@/lib/copy";
import { logActivity, type ActivityType } from "@/lib/partners";
import { routes } from "@/lib/routes";
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";

import { useAuthStore } from "@/stores/auth-store";

const TYPE_OPTIONS = [
  { value: "walk", label: "Walk" },
  { value: "run", label: "Run" },
  { value: "strength", label: "Strength" },
  { value: "yoga", label: "Yoga" },
  { value: "cycle", label: "Cycle" },
  { value: "meditation", label: "Meditation" },
  { value: "sleep", label: "Sleep" },
  { value: "other", label: "Other" },
] as const;

const INTENSITY_OPTIONS = [
  { value: "easy", label: "Easy" },
  { value: "moderate", label: "Moderate" },
  { value: "hard", label: "Hard" },
] as const;

export default function LogActivityScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const [type, setType] = useState<string>("walk");
  const [minutes, setMinutes] = useState("");
  const [intensity, setIntensity] = useState<string>("moderate");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!session) return <Redirect href={routes.login} />;

  const save = async () => {
    setBusy(true);
    setMessage(null);
    const mins = Number(minutes);
    const res = await logActivity({
      userId: session.user.id,
      activityType: type as ActivityType,
      durationMin: Number.isFinite(mins) && mins > 0 ? Math.round(mins) : null,
      intensity: (intensity as "easy" | "moderate" | "hard") || null,
      notes: note,
    });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message);
      return;
    }
    router.replace(routes.partners);
  };

  return (
    <Screen scroll>
      <ScreenHeader
        title={COPY.partnersLogActivityCta}
        onBack={() => router.back()}
        backLabel={COPY.partnersTitle}
      />

      <View style={styles.fields}>
        {/* Eight options do not fit a segmented control, so they wrap as chips. */}
        <View>
          <Text style={styles.fieldLabel}>{COPY.activityFormType}</Text>
          <View style={styles.chipRow}>
            {TYPE_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={type === option.value}
                onPress={() => setType(option.value)}
              />
            ))}
          </View>
        </View>

        <TextInput
          label={COPY.activityFormMinutes}
          value={minutes}
          onChangeText={setMinutes}
          keyboardType="numeric"
          placeholder="e.g. 30"
        />

        <ChoiceToggle
          label={COPY.activityFormIntensity}
          options={INTENSITY_OPTIONS}
          value={intensity}
          onChange={(v) => setIntensity(v || "moderate")}
          allowClear={false}
        />

        <TextInput
          label={COPY.activityFormNote}
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={2}
          placeholder="How did it feel?"
        />
      </View>

      {message ? (
        <View style={styles.errorWrap}>
          <Card>
            <Text style={styles.error}>{message}</Text>
          </Card>
        </View>
      ) : null}

      <View style={styles.footer}>
        <PrimaryButton
          title={COPY.activityFormSave}
          loading={busy}
          onPress={save}
        />
        <TextButton title="Cancel" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fields: {
    // TextInput and ChoiceToggle already carry 24px of their own top margin.
    gap: Gap.cards,
  },
  fieldLabel: {
    marginBottom: Gap.labelToField,
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
  },
  errorWrap: {
    marginTop: Gap.cards,
  },
  error: {
    ...typeStyle("body"),
    color: Colors.red,
  },
  footer: {
    marginTop: Gap.beforeFooter - Space.md,
  },
});
