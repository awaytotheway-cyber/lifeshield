/**
 * Local notification scheduling for user-defined reminders.
 *
 * Mirrors the pattern in lib/follow-up-reminders.ts:
 *   - expo-notifications is dynamic-imported so this file is safe to include
 *     from web bundles (where the module doesn't ship).
 *   - Web returns 'unavailable' and no-ops so nothing crashes.
 *   - Permission is optional. If denied, the reminders list still works —
 *     users just miss the local push.
 *
 * One DATE trigger per reminder, holding the next fire only. When a reminder
 * fires (or when the app resumes), scheduleReminder() is called again to arm
 * the following occurrence via nextOccurrence(). Simpler than repeating
 * triggers, which are harder to cancel deterministically.
 */
import { Platform } from "react-native";

import {
  nextOccurrence,
  type Reminder,
  type ReminderCadence,
} from "@/lib/reminders";

export type ReminderPermission = "granted" | "denied" | "unavailable";

const CHANNEL_ID = "reminders";

async function loadNotifications() {
  return import("expo-notifications");
}

export async function requestReminderPermission(): Promise<ReminderPermission> {
  try {
    if (Platform.OS === "web") return "unavailable";
    const Notifications = await loadNotifications();
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === "granted") return "granted";
    const asked = await Notifications.requestPermissionsAsync();
    return asked.status === "granted" ? "granted" : "denied";
  } catch {
    return "unavailable";
  }
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    const Notifications = await loadNotifications();
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch {
    // Non-fatal.
  }
}

/**
 * Schedule (or re-schedule) a single reminder's next fire. Cancels the
 * existing platform notification (if any) first so an edit doesn't leave a
 * stale one queued. Returns the new platform id, or null if nothing was
 * scheduled (permission denied, web, paused, or nothing left to fire).
 */
export async function scheduleReminder(
  reminder: Reminder,
  now: Date = new Date(),
): Promise<string | null> {
  try {
    if (Platform.OS === "web") return null;
    if (reminder.status !== "active") {
      await cancelReminder(reminder.local_notification_id);
      return null;
    }

    const fireAt = nextOccurrence(reminder, now);
    if (!fireAt) {
      await cancelReminder(reminder.local_notification_id);
      return null;
    }

    const Notifications = await loadNotifications();
    await ensureAndroidChannel();

    // Cancel any previous identifier we held for this reminder.
    await cancelReminder(reminder.local_notification_id);

    const identifier = `reminder-${reminder.id}`;
    // Best-effort cancel by identifier too, in case the previous id column was
    // out of sync with what the platform actually holds.
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {
      // Cancelling a missing id is fine.
    }

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: reminder.title,
        body: reminder.body ?? undefined,
        data: {
          type: "reminder",
          reminderId: reminder.id,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
        channelId: Platform.OS === "android" ? CHANNEL_ID : undefined,
      },
    });

    return identifier;
  } catch {
    return null;
  }
}

/**
 * Cancel a scheduled reminder by its platform identifier. Safe to call with
 * null / undefined — no-op in that case.
 */
export async function cancelReminder(
  localNotificationId: string | null | undefined,
): Promise<void> {
  if (!localNotificationId) return;
  try {
    if (Platform.OS === "web") return;
    const Notifications = await loadNotifications();
    await Notifications.cancelScheduledNotificationAsync(localNotificationId);
  } catch {
    // Cancelling a missing id is fine.
  }
}

/**
 * Re-arm every active reminder's next fire. Called on app resume so the local
 * notification queue reflects the current DB state even after the OS wiped it
 * (uninstall, permissions toggle, cold restart).
 */
export async function syncLocalReminders(rows: Reminder[]): Promise<void> {
  if (Platform.OS === "web") return;
  const active = rows.filter((row) => row.status === "active");
  for (const row of active) {
    await scheduleReminder(row);
  }
}

/**
 * Human label for the permission status. Nothing about our own copy pipeline
 * yet — kept plain so a caller can drop it into any surface.
 */
export function reminderPermissionNote(
  status: ReminderPermission,
): string | null {
  if (status === "granted") return null;
  if (status === "denied") {
    return "Notifications are off. Turn them on in your device settings to receive reminders.";
  }
  return "Notifications aren't available on this device. Reminders will still show in the list.";
}

// Re-export so callers only need to import from this file.
export type { ReminderCadence };
