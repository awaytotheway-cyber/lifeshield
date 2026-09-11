/**
 * Local reminders only (on this phone). No server push.
 * If permission is denied, the Follow-up list still works.
 */
import { Platform } from "react-native";

import { COPY } from "@/lib/copy";
import type { FollowUpRow } from "@/lib/follow-ups";

export type ReminderPermission = "granted" | "denied" | "unavailable";

function dueDateToLocalMorning(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map((part) => Number(part));
  const date = new Date(year || 1970, (month || 1) - 1, day || 1, 9, 0, 0, 0);
  const soon = new Date(Date.now() + 15_000);
  if (date.getTime() <= Date.now()) {
    return soon;
  }
  return date;
}

async function loadNotifications() {
  return import("expo-notifications");
}

export async function requestFollowUpReminderPermission(): Promise<ReminderPermission> {
  try {
    if (Platform.OS === "web") {
      return "unavailable";
    }
    const Notifications = await loadNotifications();
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === "granted") {
      return "granted";
    }
    const asked = await Notifications.requestPermissionsAsync();
    return asked.status === "granted" ? "granted" : "denied";
  } catch {
    return "unavailable";
  }
}

export async function syncLocalFollowUpReminders(
  rows: FollowUpRow[],
): Promise<void> {
  try {
    if (Platform.OS === "web") {
      return;
    }
    const Notifications = await loadNotifications();
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("follow-ups", {
        name: "Follow-up reminders",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const pending = rows.filter((row) => row.status === "pending");
    for (const row of pending) {
      const isSymptom = row.type === "symptom_check";
      const identifier = isSymptom
        ? `followup-symptom-${row.id}`
        : `followup-${row.id}`;
      try {
        await Notifications.cancelScheduledNotificationAsync(identifier);
      } catch {
        // Cancelling a missing id is fine.
      }

      const title = isSymptom
        ? COPY.followUpSymptomReminderTitle
        : COPY.followUpReminderTitle;
      const body = isSymptom
        ? COPY.followUpSymptomReminderBody
        : `${row.title}. ${COPY.followUpReminderBody}`;

      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title,
          body,
          data: isSymptom
            ? {
                type: "symptom_check",
                followUpId: row.id,
              }
            : {
                type: row.type === "retest" ? "retest" : "follow_up",
              },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: dueDateToLocalMorning(row.due_date),
          channelId: Platform.OS === "android" ? "follow-ups" : undefined,
        },
      });
    }
  } catch {
    // Reminders are optional. Never crash the hub.
  }
}

export function reminderNoteFor(status: ReminderPermission): string | null {
  if (status === "denied") {
    return COPY.followUpRemindersDenied;
  }
  if (status === "unavailable") {
    return COPY.followUpRemindersUnavailable;
  }
  return COPY.followUpRemindersOn;
}
