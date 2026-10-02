import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

import {
  DangerButton,
  PrimaryButton,
  SecondaryButton,
  TextButton,
} from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { TextField } from "@/components/ui/TextField";
import { COPY } from "@/lib/copy";
import { requestAccountDeletion } from "@/lib/data-export";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { routes } from "@/lib/routes";
import { Colors, Gap, Radius, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

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
    <Screen scroll>
      <ScreenHeader
        title={COPY.privacyDeleteTitle}
        subtitle={COPY.privacyDeleteBody}
        onBack={() => router.replace(routes.settingsPrivacy)}
        backLabel={COPY.privacyTitle}
      />

      <View style={styles.warning}>
        <Text style={styles.warningText}>{COPY.privacyDeleteWarning}</Text>
      </View>

      {done ? (
        <Card style={styles.card}>
          <Text style={styles.done}>{COPY.privacyDeleteSubmitted}</Text>
          <PrimaryButton
            title={COPY.signOut}
            onPress={() => {
              void signOut();
            }}
          />
        </Card>
      ) : (
        <>
          <Card style={styles.card}>
            <TextField
              label={COPY.privacyDeleteReason}
              value={reason}
              onChangeText={setReason}
              multiline
            />
            <TextField
              label="Type DELETE to confirm"
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="characters"
            />
          </Card>

          {message ? <Text style={styles.error}>{message}</Text> : null}

          <View style={styles.actions}>
            <DangerButton
              title={COPY.privacyDeleteConfirm}
              loading={busy}
              disabled={!canSubmit}
              onPress={() => void submit()}
            />
            <SecondaryButton
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
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  warning: {
    borderRadius: Radius.card,
    backgroundColor: Colors.redTint,
    padding: Space.cardPad,
  },
  warningText: {
    ...typeStyle("body"),
    color: Colors.red,
  },
  card: {
    marginTop: Gap.cards,
  },
  done: {
    ...typeStyle("body"),
    color: Colors.body,
  },
  error: {
    ...typeStyle("secondary"),
    marginTop: Space.lg,
    color: Colors.red,
  },
  actions: {
    marginTop: Gap.beforeFooter,
  },
});
