import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";

import {
  DangerButton,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import {
  nextOccurrence,
  scheduleLabel,
  type Reminder,
  type ReminderStatus,
} from "@/lib/reminders";
import {
  deleteReminder,
  loadReminders,
  updateReminderSchedule,
  updateReminderStatus,
} from "@/lib/reminders-io";
import {
  cancelReminder,
  scheduleReminder,
} from "@/lib/reminders-notifications";
import { fontFamily } from "@/lib/typography";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";

type LoadState = "idle" | "loading" | "ready" | "error";

export default function ReminderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const session = useAuthStore((state) => state.session);
  const userId = session?.user.id ?? null;
  const reminderId = typeof id === "string" ? id.trim() : "";

  const [state, setState] = useState<LoadState>("idle");
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId || !reminderId) return;
    setState("loading");
    setErrorMessage(null);
    const outcome = await loadReminders(userId);
    if (!outcome.ok) {
      setErrorMessage(outcome.message);
      setState("error");
      return;
    }
    const found = outcome.rows.find((row) => row.id === reminderId) ?? null;
    if (!found) {
      setErrorMessage("This reminder wasn't found. It may have been deleted.");
      setState("error");
      return;
    }
    setReminder(found);
    setState("ready");
  }, [userId, reminderId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!session) return <Redirect href={routes.login} />;
  if (!reminderId) return <Redirect href={routes.reminders} />;

  async function onSetStatus(next: ReminderStatus) {
    if (!reminder || busy) return;
    setBusy(true);
    const outcome = await updateReminderStatus(reminder.id, next);
    if (!outcome.ok) {
      setBusy(false);
      Alert.alert("Couldn't update reminder", outcome.message);
      return;
    }
    // Keep the platform notification queue in sync with the new status.
    if (next === "active") {
      const platformId = await scheduleReminder(outcome.row);
      if (platformId) {
        await updateReminderSchedule(outcome.row.id, {
          local_notification_id: platformId,
        });
      }
    } else {
      await cancelReminder(outcome.row.local_notification_id);
      if (outcome.row.local_notification_id) {
        await updateReminderSchedule(outcome.row.id, {
          local_notification_id: null,
        });
      }
    }
    setReminder({ ...outcome.row, status: next });
    setBusy(false);
  }

  async function onDelete() {
    if (!reminder || busy) return;
    Alert.alert(
      "Delete this reminder?",
      "The scheduled notification will be cancelled and the reminder will be removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            await cancelReminder(reminder.local_notification_id);
            const outcome = await deleteReminder(reminder.id);
            setBusy(false);
            if (!outcome.ok) {
              Alert.alert("Couldn't delete reminder", outcome.message);
              return;
            }
            router.replace(routes.reminders);
          },
        },
      ],
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader
        title="Reminder"
        onBack={() => router.replace(routes.reminders)}
      />

      {state === "loading" ? (
        <ActivityIndicator color={colors.primaryBlue} style={styles.spinner} />
      ) : null}

      {state === "error" && errorMessage ? (
        <GlassCard intensity="card" style={styles.errorCard}>
          <Text style={styles.errorHeading}>Couldn't open this reminder</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
          <SecondaryButton title="Try again" onPress={() => void refresh()} />
        </GlassCard>
      ) : null}

      {state === "ready" && reminder ? (
        <ReminderBody
          reminder={reminder}
          busy={busy}
          onSetStatus={onSetStatus}
          onDelete={onDelete}
        />
      ) : null}
    </Screen>
  );
}

function ReminderBody({
  reminder,
  busy,
  onSetStatus,
  onDelete,
}: {
  reminder: Reminder;
  busy: boolean;
  onSetStatus: (next: ReminderStatus) => void;
  onDelete: () => void;
}) {
  const next =
    reminder.status === "active"
      ? nextOccurrence(reminder, new Date())
      : null;
  return (
    <>
      <GlassCard intensity="card" style={styles.summary}>
        <Text style={styles.cadence}>{scheduleLabel(reminder)}</Text>
        <Text style={styles.title}>{reminder.title}</Text>
        {reminder.body ? (
          <Text style={styles.body}>{reminder.body}</Text>
        ) : null}
        <Text style={styles.meta}>
          Status: {statusLabel(reminder.status)}
          {reminder.source_kind !== "self"
            ? ` · from ${reminder.source_kind}`
            : ""}
        </Text>
        {next ? (
          <Text style={styles.meta}>Next fire: {next.toLocaleString()}</Text>
        ) : null}
        {reminder.last_fired_at ? (
          <Text style={styles.meta}>
            Last fired: {new Date(reminder.last_fired_at).toLocaleString()}
          </Text>
        ) : null}
      </GlassCard>

      <View style={styles.actionRow}>
        {reminder.status === "active" ? (
          <SecondaryButton
            title="Pause"
            disabled={busy}
            onPress={() => onSetStatus("paused")}
          />
        ) : (
          <PrimaryButton
            title="Resume"
            disabled={busy}
            onPress={() => onSetStatus("active")}
          />
        )}
        {reminder.status !== "completed" ? (
          <SecondaryButton
            title="Mark complete"
            disabled={busy}
            onPress={() => onSetStatus("completed")}
          />
        ) : null}
        <DangerButton title="Delete" disabled={busy} onPress={onDelete} />
      </View>
    </>
  );
}

function statusLabel(status: ReminderStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "paused":
      return "Paused";
    case "completed":
      return "Completed";
    default:
      return status;
  }
}

const styles = StyleSheet.create({
  spinner: {
    marginTop: spacing.md,
  },
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
  summary: {
    marginTop: spacing.md,
    padding: spacing.base,
    borderRadius: radius.card,
    ...shadows.card,
  },
  cadence: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    color: colors.primaryBlue,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.micro,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    color: colors.deepNavy,
    marginBottom: spacing.micro,
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.slate,
    marginBottom: spacing.sm,
  },
  meta: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.slate,
    marginTop: spacing.micro,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
