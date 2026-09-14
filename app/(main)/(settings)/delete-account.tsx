import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, DangerButton, TextButton } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { TextField } from "@/components/ui/TextField";
import { COPY } from "@/lib/copy";
import { requestAccountDeletion } from "@/lib/data-export";
import { colors, spacing } from "@/lib/design-tokens";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
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
    <Screen scroll contentPadding={spacing.screenX}>
      <ScreenHeader
        title={COPY.privacyDeleteTitle}
        onBack={() => router.replace(routes.settingsPrivacy)}
      />
      <Text style={styles.body}>{COPY.privacyDeleteBody}</Text>
      <Text style={styles.warning}>{COPY.privacyDeleteWarning}</Text>

      {done ? (
        <GlassCard intensity="card" style={styles.card}>
          <Text style={styles.done}>{COPY.privacyDeleteSubmitted}</Text>
          <PrimaryButton
            title={COPY.signOut}
            onPress={() => {
              void signOut();
            }}
          />
        </GlassCard>
      ) : (
        <GlassCard intensity="card" style={styles.card}>
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
        </GlassCard>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
  },
  warning: {
    marginTop: 12,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    lineHeight: 22,
    color: colors.coral,
  },
  card: {
    marginTop: spacing.md,
    padding: spacing.base,
  },
  actions: {
    marginTop: spacing.md,
    gap: 8,
  },
  error: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.coral,
  },
  done: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.charcoal,
    marginBottom: spacing.md,
  },
});
