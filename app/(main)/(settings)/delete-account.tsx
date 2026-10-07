import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, DangerButton, TextButton } from "@/components/ui/Button";
import { Sheet } from "@/components/specimen/Sheet";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { TextField } from "@/components/ui/TextField";
import { COPY } from "@/lib/copy";
import { requestAccountDeletion } from "@/lib/data-export";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";
import { Accent, Ink, Measure, SpecimenType } from "@/lib/specimen-tokens";

export default function DeleteAccountScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);
  const triageStatus = useTriageStore((state) => state.status);
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!session) {
    return <Redirect href={routes.login} />;
  }
  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }
  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  const canSubmit = confirmText.trim().toUpperCase() === "DELETE" && !busy;

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await requestAccountDeletion(session.user.id, reason);
      if (!result.ok) {
        setMessage(result.message ?? COPY.privacyDeleteFailed);
        return;
      }
      setDone(true);
    } catch (error) {
      setMessage(messageFromUnknown(error, COPY.privacyDeleteFailed));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll contentPadding={Measure.gutter}>
      <ScreenHeader
        title={COPY.privacyDeleteTitle}
        onBack={() => router.replace(routes.settingsPrivacy)}
      />
      <Text style={styles.body}>{COPY.privacyDeleteBody}</Text>
      <Text style={styles.warning}>{COPY.privacyDeleteWarning}</Text>

      {done ? (
        <Sheet style={styles.card}>
          <Text style={styles.done}>{COPY.privacyDeleteSubmitted}</Text>
          <PrimaryButton
            title={COPY.signOut}
            onPress={() => {
              void signOut();
            }}
          />
        </Sheet>
      ) : (
        <Sheet style={styles.card}>
          <TextField
            label={COPY.privacyDeleteReason}
            value={reason}
            onChangeText={setReason}
            multiline
          />
          <TextField
            label='Type DELETE to confirm'
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
          />
          {message ? <Text style={styles.error}>{message}</Text> : null}
          <View style={styles.actions}>
            <DangerButton
              title={COPY.privacyDeleteConfirm}
              loading={busy}
              disabled={!canSubmit}
              onPress={() => void submit()}
            />
            <TextButton
              title={COPY.privacyExport}
              onPress={() => router.push(routes.settingsPrivacy)}
            />
            <TextButton
              title="Email support"
              onPress={() => {
                void Linking.openURL("mailto:support@prescope.app");
              }}
            />
          </View>
        </Sheet>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    lineHeight: 26,
    color: Ink.soft,
  },
  warning: {
    marginTop: 12,
    fontFamily: SpecimenType.mono,
    fontSize: 16,
    lineHeight: 24,
    color: Accent.tag,
  },
  card: {
    marginTop: Measure.loose,
    padding: Measure.base,
  },
  actions: {
    marginTop: Measure.loose,
    gap: 8,
  },
  error: {
    marginTop: 12,
    fontFamily: SpecimenType.mono,
    fontSize: 15,
    color: Accent.tag,
  },
  done: {
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    lineHeight: 26,
    color: Ink.full,
    marginBottom: Measure.loose,
  },
});
