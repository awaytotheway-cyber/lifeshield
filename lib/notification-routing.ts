/**
 * Maps notification tap payloads to Expo Router paths.
 * Used by NotificationBootstrap when the user opens a reminder.
 */
import type { Href } from "expo-router";

import { followUpSymptomHref, routes } from "@/lib/routes";

export type NotificationPayload = {
  type?: string;
  followUpId?: string;
  href?: string;
};

/** Resolve a notification data object to a screen path, or null if unknown. */
export function hrefFromNotificationData(
  data: Record<string, unknown> | undefined,
): Href | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const payload = data as NotificationPayload;
  const type = typeof payload.type === "string" ? payload.type : "";

  if (type === "symptom_check") {
    const id =
      typeof payload.followUpId === "string" ? payload.followUpId.trim() : "";
    if (id) {
      return followUpSymptomHref(id);
    }
    return routes.followUpSymptomRecheck;
  }

  if (type === "follow_up" || type === "retest" || type === "review") {
    return routes.followUp;
  }

  if (type === "results_ready") {
    return routes.labResults;
  }

  if (type === "plan_approved") {
    return routes.plan;
  }

  if (typeof payload.href === "string" && payload.href.startsWith("/")) {
    return payload.href as Href;
  }

  return null;
}
