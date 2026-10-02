import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, Platform, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ColorSwitch } from "@/components/ui/ColorSwitch";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { TimePicker } from "@/components/ui/TimePicker";
import { Toast } from "@/components/ui/Toast";
import { COPY } from "@/lib/copy";
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
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
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
    <Screen scroll>
      <ScreenHeader
        title={COPY.settingsNotifyTitle}
        subtitle={COPY.settingsNotifyBody}
        onBack={() => router.replace(routes.settings)}
        backLabel={COPY.settingsTitle}
      />

      {loading ? <StaticSkeleton rows={3} /> : null}

      {!loading ? (
        <>
          <Card>
            <ColorSwitch
              label={COPY.settingsNotifyReminders}
              value={prefs.notify_reminders}
              onChange={(next) => update({ notify_reminders: next })}
            />
            <View style={styles.divider} />
            <ColorSwitch
              label={COPY.settingsNotifyResults}
              value={prefs.notify_results}
              onChange={(next) => update({ notify_results: next })}
            />
            <View style={styles.divider} />
            <ColorSwitch
              label={COPY.settingsNotifyPlan}
              value={prefs.notify_plan}
              onChange={(next) => update({ notify_plan: next })}
            />
            <View style={styles.divider} />
            <ColorSwitch
              label={COPY.settingsNotifyMarketing}
              value={prefs.notify_marketing}
              onChange={(next) => update({ notify_marketing: next })}
            />
          </Card>

          <SectionTitle title="Timing" />
          <Card>
            <TimePicker
              label={COPY.settingsNotifyTime}
              hint={COPY.settingsNotifyTimeHint}
              value={prefs.preferred_notify_time ?? ""}
              onChange={(next) => update({ preferred_notify_time: next || null })}
            />
          </Card>
        </>
      ) : null}

      {pushNote ? <Text style={styles.note}>{pushNote}</Text> : null}
      {message ? <Text style={styles.error}>{message}</Text> : null}

      <View style={styles.footer}>
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
      </View>

      <Toast message={toast} onHide={() => setToast(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.line,
  },
  note: {
    ...typeStyle("secondary"),
    marginTop: Space.lg,
    color: Colors.body,
  },
  error: {
    ...typeStyle("secondary"),
    marginTop: Space.md,
    color: Colors.red,
  },
  footer: {
    marginTop: Gap.beforeFooter,
  },
});
