/**
 * Phase 4 Day 6 — device push token registration (for Day 7 server push).
 *
 * Remote push tokens require an EAS development or production build.
 * Expo Go cannot receive Expo push tokens — we degrade gracefully.
 * Local follow-up reminders (lib/follow-up-reminders.ts) work without this.
 */
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

import { COPY } from "@/lib/copy";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type PushRegistrationStatus =
  | "registered"
  | "denied"
  | "expo_go"
  | "simulator"
  | "unavailable"
  | "missing_project"
  | "not_configured";

export type PushRegistrationOutcome =
  | { ok: true; status: "registered"; token: string }
  | { ok: false; status: Exclude<PushRegistrationStatus, "registered">; message: string };

/** True when running inside the Expo Go app (remote push token will not work). */
export function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

function easProjectId(): string | null {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  const id = extra?.eas?.projectId?.trim();
  return id && id.length > 0 ? id : null;
}

async function loadNotifications() {
  return import("expo-notifications");
}

/** Plain note for the follow-up hub after trying push registration. */
export function pushRegistrationNoteFor(
  status: PushRegistrationStatus | null,
): string | null {
  if (status === "expo_go") {
    return COPY.followUpPushExpoGo;
  }
  if (status === "registered") {
    return COPY.followUpPushRegistered;
  }
  if (status === "denied") {
    return COPY.followUpPushDenied;
  }
  if (
    status === "unavailable" ||
    status === "simulator" ||
    status === "missing_project"
  ) {
    return COPY.followUpPushUnavailable;
  }
  return null;
}

/**
 * Ask for notification permission, obtain an Expo push token, and save it to
 * `push_tokens` for the signed-in user. Safe to call on every app open.
 */
export async function registerForPushNotifications(
  userId: string,
): Promise<PushRegistrationOutcome> {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      status: "not_configured",
      message: COPY.missingKeys,
    };
  }

  if (Platform.OS === "web") {
    return {
      ok: false,
      status: "unavailable",
      message: COPY.followUpPushUnavailable,
    };
  }

  if (isExpoGo()) {
    return {
      ok: false,
      status: "expo_go",
      message: COPY.followUpPushExpoGo,
    };
  }

  if (!Device.isDevice) {
    return {
      ok: false,
      status: "simulator",
      message: COPY.followUpPushUnavailable,
    };
  }

  const projectId = easProjectId();
  if (!projectId) {
    return {
      ok: false,
      status: "missing_project",
      message: COPY.followUpPushUnavailable,
    };
  }

  try {
    const Notifications = await loadNotifications();

    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;
    if (finalStatus !== "granted") {
      const asked = await Notifications.requestPermissionsAsync();
      finalStatus = asked.status;
    }

    if (finalStatus !== "granted") {
      return {
        ok: false,
        status: "denied",
        message: COPY.followUpPushDenied,
      };
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "LifeShield",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const tokenResult = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = tokenResult.data?.trim();
    if (!token) {
      return {
        ok: false,
        status: "unavailable",
        message: COPY.followUpPushUnavailable,
      };
    }

    const { error } = await supabase.from("push_tokens").upsert(
      {
        user_id: userId,
        expo_push_token: token,
      },
      { onConflict: "user_id,expo_push_token" },
    );

    if (error) {
      throw error;
    }

    return { ok: true, status: "registered", token };
  } catch (error) {
    return {
      ok: false,
      status: "unavailable",
      message: messageFromUnknown(error, COPY.followUpPushUnavailable),
    };
  }
}
