/**
 * Remote push event types and message builders.
 * Keep in sync with supabase/functions/_shared/push-events.ts (Edge Functions copy).
 */

export const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** Expo recommends batches of up to 100; stay under the 600/sec rate limit. */
export const EXPO_PUSH_BATCH_SIZE = 100;

export type PushEventType = "results_ready" | "plan_approved";

export type PushEventPayload = {
  type: PushEventType;
  href: string;
};

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound: "default" | null;
  data: PushEventPayload;
};

const PUSH_COPY: Record<
  PushEventType,
  { title: string; body: string; href: string }
> = {
  results_ready: {
    title: "Your lab results are ready",
    body:
      "A clinician has reviewed your results. Open PRESCOPE to read them. This is information only — not a diagnosis.",
    href: "/(main)/(results)/lab-results",
  },
  plan_approved: {
    title: "Your plan is ready",
    body:
      "Your practitioner has finalised your plan. Open PRESCOPE to see what you can do next.",
    href: "/(main)/(plan)",
  },
};

export function isPushEventType(value: string): value is PushEventType {
  return value === "results_ready" || value === "plan_approved";
}

/** Build one Expo push message per device token. */
export function buildExpoPushMessages(
  event: PushEventType,
  tokens: string[],
): ExpoPushMessage[] {
  const copy = PUSH_COPY[event];
  return tokens.map((token) => ({
    to: token,
    title: copy.title,
    body: copy.body,
    sound: "default",
    data: {
      type: event,
      href: copy.href,
    },
  }));
}

/** Split an array into fixed-size chunks (for Expo batch sends). */
export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    return items.length > 0 ? [items] : [];
  }
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
