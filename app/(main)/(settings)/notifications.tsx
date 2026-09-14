import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, Platform, StyleSheet, Text } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { ColorSwitch } from "@/components/ui/ColorSwitch";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { TimePicker } from "@/components/ui/TimePicker";
import { Toast } from "@/components/ui/Toast";
import { COPY } from "@/lib/copy";
import { colors, spacing } from "@/lib/design-tokens";
import { messageFromUnknown } from "@/lib/friendly-errors";
import {
  loadExtendedProfile,
  loadLocalNotificationPrefsFallback,
  prefsFromProfile,
  saveNotificationPrefs,
  type NotificationPrefsDraft,
} from "@/lib/profile-extended";
import {
  isExpoGo,
  pushRegistrationNoteFor,
  registerForPushNotifications,
} from "@/lib/push-notifications";
import { routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

export default function NotificationsSettingsScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefsDraft>({
    notify_reminders: true,
    notify_results: true,
    notify_plan: true,
    notify_marketing: false,
    preferred_notify_time: "09:00",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [pushNote, setPushNote] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user.id) {
      return;
    }
    setLoading(true);
    try {
      const [profile, fallback] = await Promise.all([
        loadExtendedProfile(session.user.id),
        loadLocalNotificationPrefsFallback(session.user.id),
      ]);
      setPrefs(prefsFromProfile(profile.profile, fallback));
      if (profile.needsMigration) {
        setMessage(COPY.profileNeedsMigration);
      }
      if (!isExpoGo()) {
        const push = await registerForPushNotifications(session.user.id);
        setPushNote(pushRegistrationNoteFor(push.status));
      } else {
        setPushNote(COPY.followUpPushExpoGo);
      }
    } catch (error) {
      setMessage(messageFromUnknown(error, COPY.settingsNotifySaveFailed));
    } finally {
      setLoading(false);
    }
  }, [session?.user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!session) {
    return <Redirect href={routes.login} />;
  }
  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }
  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  const update = (patch: Partial<NotificationPrefsDraft>) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await saveNotificationPrefs(session.user.id, prefs);
      if (!result.ok) {
        setMessage(result.message ?? COPY.settingsNotifySaveFailed);
        return;
      }
      if (result.needsMigration) {
        setMessage(COPY.profileNeedsMigration);
      }
      setDirty(false);
      setToast(COPY.settingsNotifySaved);
    } catch (error) {
      setMessage(messageFromUnknown(error, COPY.settingsNotifySaveFailed));
    } finally {
      setSaving(false);
    }
  };

  const openSystemSettings = async () => {
    try {
      if (Platform.OS === "ios") {
        await Linking.openURL("app-settings:");
        return;
      }
      await Linking.openSettings();
    } catch {
      setMessage(COPY.settingsNotifySystemFailed);
    }
  };

  return (
    <Screen scroll contentPadding={spacing.screenX}>
      <ScreenHeader
        title={COPY.settingsNotifyTitle}
        onBack={() => router.replace(routes.settings)}
      />
      <Text style={styles.body}>{COPY.settingsNotifyBody}</Text>
      {loading ? <StaticSkeleton rows={3} /> : null}
      {!loading ? (
        <GlassCard intensity="card" style={styles.card}>
          <ColorSwitch
            label={COPY.settingsNotifyReminders}
            value={prefs.notify_reminders}
            onChange={(next) => update({ notify_reminders: next })}
          />
          <ColorSwitch
            label={COPY.settingsNotifyResults}
            value={prefs.notify_results}
            onChange={(next) => update({ notify_results: next })}
          />
          <ColorSwitch
            label={COPY.settingsNotifyPlan}
            value={prefs.notify_plan}
            onChange={(next) => update({ notify_plan: next })}
          />
          <ColorSwitch
            label={COPY.settingsNotifyMarketing}
            value={prefs.notify_marketing}
            onChange={(next) => update({ notify_marketing: next })}
          />
          <TimePicker
            label={COPY.settingsNotifyTime}
            hint={COPY.settingsNotifyTimeHint}
            value={prefs.preferred_notify_time ?? ""}
            onChange={(next) => update({ preferred_notify_time: next || null })}
          />
        </GlassCard>
      ) : null}
      {pushNote ? <Text style={styles.note}>{pushNote}</Text> : null}
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <PrimaryButton
        title={COPY.settingsNotifySave}
        loading={saving}
        disabled={saving || !dirty || loading}
        onPress={() => void save()}
      />
      <TextButton
        title={COPY.settingsNotifySystem}
        onPress={() => void openSystemSettings()}
      />
      <Toast message={toast} onHide={() => setToast(null)} />
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
  card: {
    marginTop: spacing.md,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  note: {
    marginTop: 8,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.slate,
  },
  error: {
    marginTop: 8,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.coral,
  },
});
