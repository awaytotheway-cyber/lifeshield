import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, Platform, StyleSheet, Switch, Text, View } from "react-native";

import { IconButton, PrimaryButton, TextButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { Surface } from "@/components/ui/Surface";
import { TimePicker } from "@/components/ui/TimePicker";
import { Toast } from "@/components/ui/Toast";
import { TwoTone } from "@/components/ui/TwoTone";
import { COPY } from "@/lib/copy";
import { colors, controlHeight, spacing, status } from "@/lib/design-tokens";
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
import { fontFamily, typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/** Failure text borrows the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

type SwitchRowProps = {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  /** False on the last row of a block: nothing follows it to divide from. */
  divided?: boolean;
};

/**
 * A 56pt row whose right edge is a switch. Only the switch is the target —
 * the row is the label, not a second way to flip it.
 */
function SwitchRow({ label, value, onChange, divided = true }: SwitchRowProps) {
  return (
    <View style={[styles.row, divided ? styles.rowDivided : null]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        // The board's switch accent is ink. Off is the hairline, the one
        // divider colour, so an off switch reads as absent rather than grey.
        trackColor={{ false: colors.hairline, true: colors.ink }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.hairline}
      />
    </View>
  );
}

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
      <View style={styles.topRow}>
        <IconButton
          icon="arrow-left"
          accessibilityLabel="Back to settings"
          onPress={() => router.replace(routes.settings)}
          style={styles.back}
        />
      </View>

      <View accessibilityRole="header">
        <TwoTone
          size="xl"
          parts={[{ text: COPY.settingsNotifyTitle, tone: "bold" }]}
        />
      </View>

      {/* What push can and cannot do in this build. Never trimmed. */}
      <Text style={styles.lede}>{COPY.settingsNotifyBody}</Text>

      {loading ? <StaticSkeleton rows={3} /> : null}

      {!loading ? (
        <>
          <Text style={styles.groupLabel}>{COPY.settingsGroupReminders}</Text>
          <Surface padded={false} style={styles.block}>
            <SwitchRow
              label={COPY.settingsNotifyReminders}
              value={prefs.notify_reminders}
              onChange={(next) => update({ notify_reminders: next })}
            />
            <SwitchRow
              label={COPY.settingsNotifyResults}
              value={prefs.notify_results}
              onChange={(next) => update({ notify_results: next })}
            />
            <SwitchRow
              label={COPY.settingsNotifyPlan}
              value={prefs.notify_plan}
              onChange={(next) => update({ notify_plan: next })}
            />
            <SwitchRow
              label={COPY.settingsNotifyMarketing}
              value={prefs.notify_marketing}
              onChange={(next) => update({ notify_marketing: next })}
              divided={false}
            />
          </Surface>

          <Surface style={styles.timeCard}>
            <TimePicker
              label={COPY.settingsNotifyTime}
              hint={COPY.settingsNotifyTimeHint}
              value={prefs.preferred_notify_time ?? ""}
              onChange={(next) =>
                update({ preferred_notify_time: next || null })
              }
            />
          </Surface>
        </>
      ) : null}

      {pushNote ? <Text style={styles.note}>{pushNote}</Text> : null}
      {message ? <Text style={styles.error}>{message}</Text> : null}

      {/* The one black button on this screen. */}
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
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  back: {
    // Pulled into the gutter so the glyph, not its 44pt hit area, lines up
    // with the headline under it.
    marginLeft: -12,
  },
  lede: {
    marginTop: spacing.mdSm,
    ...typography.body,
    color: colors.inkSoft,
  },
  groupLabel: {
    marginTop: 22,
    marginBottom: 10,
    ...typography.micro,
    // 11px micro labels use `inkMuted`; `inkFaint` is headline-only.
    color: colors.inkMuted,
  },
  block: {
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: controlHeight,
    paddingVertical: 10,
  },
  // The one divider in the system: a 1px hairline between rows of a block,
  // never a border around the block itself.
  rowDivided: {
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  rowLabel: {
    flex: 1,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
  },
  timeCard: {
    marginTop: spacing.base,
  },
  note: {
    marginTop: spacing.base,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkSoft,
  },
  error: {
    marginTop: spacing.mdSm,
    ...typography.label,
    color: CLAY,
  },
});
