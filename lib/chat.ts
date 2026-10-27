/**
 * Chat message logic: the pure helpers a thread screen reads, plus thin
 * wrappers over the one table behind them.
 *
 * WHAT A CHAT MESSAGE CARRIES: a body of text, who sent it, and when. That is
 * the whole surface. The design board's line — "Results and reports are never
 * shared in chat" — is kept structurally here, not as copy: `ChatMessage` has
 * no attachment, no result id, no order id and no medication field, and
 * nothing in this module imports from the assessment, triage, results, orders
 * or medication modules. Adding a column that referenced any of them would be
 * the change that breaks the promise, so it should be refused here.
 *
 * SCHEMA (verified against the live project):
 *   chat_messages  id, connection_id, sender_id, body, created_at
 *
 * There is NO read_at column, so the database has no notion of "read". A true
 * server-side unread count is therefore impossible, and none is invented here.
 * `unreadSince` instead takes a last-seen timestamp the UI holds locally — see
 * its own comment. A badge driven by it is honest about where that state
 * lives; a badge claiming the database knows would not be.
 *
 * Reads are filtered by `connection_id` explicitly. RLS does restrict the
 * table to the two parties of a connection — but there is also a
 * `chat_admin_read` policy, so for an admin-staff account an unfiltered select
 * would return every message in the product. A thread has to mean one thread
 * for everyone.
 *
 * The Supabase client is loaded with a dynamic import (as lib/buddies.ts
 * does) so that importing this module costs nothing until a wrapper is
 * actually called, and so the pure half above stays testable under plain
 * node — a static `@/lib/supabase` import pulls in react-native.
 */
import { messageFromUnknown } from "@/lib/friendly-errors";

// ---------------------------------------------------------------- types

/** A row from public.chat_messages. */
export type ChatMessage = {
  id: string;
  connection_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type MessageValidation =
  | { ok: true; body: string }
  | { ok: false; reason: "empty" | "too_long" };

/** One day's worth of a thread. `day` is a local calendar date, `YYYY-MM-DD`. */
export type ChatDay = {
  day: string;
  label: string;
  messages: ChatMessage[];
};

// ------------------------------------------------------- pure functions

/**
 * The longest message we accept, in UTF-16 code units — the same unit a
 * `maxLength` on the composer and a `body.length` counter beside it use, so
 * the three can never disagree. The column itself is unbounded `text`; this is
 * a product cap, measured after trimming.
 */
export const MAX_MESSAGE_LENGTH = 2000;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Trim, then accept or say why not.
 *
 * Trimming happens first so that whitespace can neither stand in for content
 * nor push a legal message over the cap. The accepted `body` is returned
 * rather than re-derived by the caller, so what is validated is exactly what
 * gets sent.
 */
export function validateMessage(body: string): MessageValidation {
  const trimmed = (typeof body === "string" ? body : "").trim();
  if (trimmed.length === 0) return { ok: false, reason: "empty" };
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, reason: "too_long" };
  }
  return { ok: true, body: trimmed };
}

/** A date's calendar day in the device timezone, as `YYYY-MM-DD`. */
function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * The heading above a day's messages.
 *
 * The absolute form is composed by hand — `"12 October"` — rather than taken
 * from `toLocaleDateString`, whose day/month order follows whatever locale the
 * device happens to carry. The design calls for one shape, so one shape is
 * what every device renders.
 *
 * A year is appended when the day falls in a different year from `now`, so
 * that a long-running thread cannot show two different "12 October" headings.
 */
function dayLabel(date: Date, dayKey: string, now: Date): string {
  if (dayKey === localDayKey(now)) return "Today";

  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  );
  if (dayKey === localDayKey(yesterday)) return "Yesterday";

  const absolute = `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear()
    ? absolute
    : `${absolute} ${date.getFullYear()}`;
}

/**
 * Split a thread into day buckets, oldest first, messages inside each bucket
 * oldest first too. Input order does not matter.
 *
 * Days are compared as calendar days in the device timezone, not as UTC
 * offsets: two messages twenty minutes apart either side of local midnight
 * belong to different days, and a message sent at 23:50 local must not appear
 * under tomorrow's heading because UTC had already rolled over.
 *
 * `now` is injectable, defaulting to the real clock, so that "Today" and
 * "Yesterday" can be pinned in a test instead of changing meaning overnight.
 *
 * A message whose `created_at` cannot be parsed is dropped. It cannot be
 * placed on a day, and a bucket headed "Invalid Date" would be worse than a
 * missing line.
 */
export function groupByDay(
  msgs: ChatMessage[],
  now: Date = new Date(),
): ChatDay[] {
  const ordered = (msgs ?? [])
    .filter((m): m is ChatMessage => m != null)
    .map((m) => ({ message: m, at: Date.parse(m.created_at ?? "") }))
    .filter((entry) => Number.isFinite(entry.at))
    .sort((a, b) => a.at - b.at);

  // A Map keeps first-insertion order, and the entries were just sorted
  // oldest-first, so the buckets come out oldest-first without a second sort.
  const buckets = new Map<string, ChatDay>();

  for (const { message, at } of ordered) {
    const date = new Date(at);
    const key = localDayKey(date);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { day: key, label: dayLabel(date, key, now), messages: [] };
      buckets.set(key, bucket);
    }
    bucket.messages.push(message);
  }

  return [...buckets.values()];
}

/**
 * Whether I sent this message — which side of the thread it is drawn on.
 *
 * A blank `meId` is nobody, so nothing is mine. Returning true there would
 * make a signed-out or still-loading screen render the whole thread as
 * sent-by-me, which reads as if the other person never spoke.
 */
export function isMine(m: ChatMessage, meId: string): boolean {
  const me = (typeof meId === "string" ? meId : "").trim();
  if (me.length === 0) return false;
  return m?.sender_id === me;
}

/**
 * How many of the other person's messages arrived after `lastSeenIso`.
 *
 * chat_messages has no read_at column, so "read" is not something the database
 * records and this is NOT a server-side unread count. `lastSeenIso` is a
 * timestamp the UI stores on the device when the thread is on screen; the
 * storage is the UI's business, not this module's. Treat any badge built on
 * this as "new to this device since you last looked", which is what it is.
 *
 * My own messages never count. The boundary is exclusive, so a message stamped
 * exactly at last-seen has been seen and an idle screen cannot re-count its
 * own last render. A missing or unparseable `lastSeenIso` means never-seen, so
 * everything of theirs counts — the honest direction to fail, since the
 * alternative silently hides new messages. An empty `meId` yields 0: with no
 * signed-in user there is no "other person" to count.
 */
export function unreadSince(
  msgs: ChatMessage[],
  meId: string,
  lastSeenIso: string | null,
): number {
  const me = (typeof meId === "string" ? meId : "").trim();
  if (me.length === 0) return 0;

  const seenAt = lastSeenIso ? Date.parse(lastSeenIso) : Number.NaN;
  const cutoff = Number.isFinite(seenAt) ? seenAt : Number.NEGATIVE_INFINITY;

  let count = 0;
  for (const m of msgs ?? []) {
    if (m == null || m.sender_id === me) continue;
    const at = Date.parse(m.created_at ?? "");
    if (!Number.isFinite(at)) continue;
    if (at > cutoff) count += 1;
  }
  return count;
}

// ------------------------------------------------- Supabase wrappers

const MESSAGE_COLUMNS = "id, connection_id, sender_id, body, created_at";

type SupabaseModule = typeof import("@/lib/supabase");

let supabaseModulePromise: Promise<SupabaseModule> | null = null;

function loadSupabase(): Promise<SupabaseModule> {
  supabaseModulePromise ??= import("@/lib/supabase");
  return supabaseModulePromise;
}

export type LoadThreadOutcome =
  | { ok: true; rows: ChatMessage[] }
  | { ok: false; rows: []; message: string };

export type SendMessageOutcome = { ok: true } | { ok: false; message: string };

/** Cancels a thread subscription. Safe to call more than once. */
export type ChatUnsubscribe = () => void;

/** The signed-in user's id, or null when there is no session. */
async function currentUserId(): Promise<string | null> {
  const { supabase } = await loadSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function normaliseMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: String(row.id ?? ""),
    connection_id: String(row.connection_id ?? ""),
    sender_id: String(row.sender_id ?? ""),
    body: typeof row.body === "string" ? row.body : "",
    created_at: typeof row.created_at === "string" ? row.created_at : "",
  };
}

/**
 * One thread, oldest message first.
 *
 * The `connection_id` filter is the point of the query, not an optimisation:
 * see the note at the top of the file about `chat_admin_read`. A blank id
 * cannot name a thread, so it returns an empty thread rather than a query with
 * no scope.
 */
export async function loadThread(
  connectionId: string,
): Promise<LoadThreadOutcome> {
  const id = (connectionId ?? "").trim();
  if (id.length === 0) return { ok: true, rows: [] };

  const { isSupabaseConfigured, supabase } = await loadSupabase();
  if (!isSupabaseConfigured) return { ok: true, rows: [] };

  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .select(MESSAGE_COLUMNS)
      .eq("connection_id", id)
      .order("created_at", { ascending: true });
    if (error) {
      return {
        ok: false,
        rows: [],
        message: messageFromUnknown(
          error,
          "We couldn't load this conversation just now.",
        ),
      };
    }
    const rows = Array.isArray(data) ? data : [];
    return { ok: true, rows: rows.map(normaliseMessage) };
  } catch (error: unknown) {
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(
        error,
        "We couldn't load this conversation just now.",
      ),
    };
  }
}

/**
 * Send a message. Validated before anything touches the network, so an empty
 * or over-long message never costs a round trip.
 *
 * `sender_id` is always the signed-in user. RLS refuses anything else, and
 * refuses a connection that is not active or not mine — a pending request is
 * not a conversation.
 */
export async function sendMessage(
  connectionId: string,
  body: string,
): Promise<SendMessageOutcome> {
  const validated = validateMessage(body);
  if (!validated.ok) {
    return {
      ok: false,
      message:
        validated.reason === "empty"
          ? "Write something first."
          : `Messages can be up to ${MAX_MESSAGE_LENGTH} characters.`,
    };
  }

  const id = (connectionId ?? "").trim();
  if (id.length === 0) {
    return { ok: false, message: "We couldn't find that conversation." };
  }

  const { isSupabaseConfigured, supabase } = await loadSupabase();
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Connect Supabase to send a message." };
  }

  const meId = await currentUserId();
  if (!meId) {
    return { ok: false, message: "Please sign in again to send a message." };
  }

  try {
    const { error } = await supabase.from("chat_messages").insert({
      connection_id: id,
      sender_id: meId,
      body: validated.body,
    });
    if (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, "We couldn't send that message."),
      };
    }
    return { ok: true };
  } catch (error: unknown) {
    return {
      ok: false,
      message: messageFromUnknown(error, "We couldn't send that message."),
    };
  }
}

/**
 * Live inserts on one thread. Returns the unsubscribe function immediately —
 * synchronously, so it can be a `useEffect` cleanup — while the client loads
 * and the channel opens in the background. Unsubscribing before the channel
 * is up cancels the setup instead of leaking a channel.
 *
 * The server-side filter scopes the stream to this `connection_id`, and the
 * callback checks the row's own `connection_id` again before handing it on:
 * one broadened filter should not be able to leak another pair's conversation
 * into this screen.
 */
export function subscribeToThread(
  connectionId: string,
  onMessage: (message: ChatMessage) => void,
): ChatUnsubscribe {
  const id = (connectionId ?? "").trim();
  let cancelled = false;
  let teardown: (() => void) | null = null;

  void (async () => {
    if (id.length === 0) return;

    try {
      const { isSupabaseConfigured, supabase } = await loadSupabase();
      if (cancelled || !isSupabaseConfigured) return;

      const channel = supabase
        .channel(`chat_messages:${id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `connection_id=eq.${id}`,
          },
          (payload) => {
            if (cancelled) return;
            const raw = payload.new as Record<string, unknown> | null;
            if (raw == null) return;
            const message = normaliseMessage(raw);
            if (message.connection_id !== id) return;
            onMessage(message);
          },
        )
        .subscribe();

      teardown = () => {
        void supabase.removeChannel(channel);
      };

      // The caller may have unsubscribed while the channel was opening.
      if (cancelled) {
        teardown();
        teardown = null;
      }
    } catch {
      // Opening the channel failed — offline, or realtime disabled on the
      // project. Swallowed deliberately: the signature has no error channel,
      // and the thread is still readable because `loadThread` fetched it.
      // The cost is that new messages need a manual refresh, not a crash and
      // not an unhandled rejection from this fire-and-forget setup.
      teardown = null;
    }
  })();

  return () => {
    cancelled = true;
    if (teardown) {
      teardown();
      teardown = null;
    }
  };
}
