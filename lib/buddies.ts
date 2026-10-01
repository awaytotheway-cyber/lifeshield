/**
 * Accountability Buddies — opt-in discovery, connection lifecycle, chat.
 *
 * Users must set is_buddy_discoverable = true on their profile before
 * they appear to anyone else. Chat messages are only readable by the
 * two users on an ACTIVE connection (RLS enforces this).
 */
import { COPY } from "@/lib/copy";
import { messageFromUnknown, rawErrorText } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type ConnectionStatus = "requested" | "active" | "declined" | "inactive";

export type ConnectionRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: ConnectionStatus;
  request_note: string | null;
  created_at: string;
  updated_at: string;
};

export type BuddyProfile = {
  user_id: string;
  display_name: string;
  city: string | null;
  interests: string[];
};

export type PotentialBuddyRow = BuddyProfile & {
  shared_interests: string[];
  match_score: number;
};

export type ChatMessageRow = {
  id: string;
  connection_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

const CONN_COLS =
  "id, requester_id, addressee_id, status, request_note, created_at, updated_at";
const CHAT_COLS = "id, connection_id, sender_id, body, created_at";

const REQUEST_TIMEOUT_MS = 15_000;

function withTimeout<T>(p: PromiseLike<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), REQUEST_TIMEOUT_MS);
    Promise.resolve(p)
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e: unknown) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

export function looksLikeBuddiesBackendMissing(error: unknown): boolean {
  const text = rawErrorText(error).toLowerCase();
  return (
    (text.includes("connections") || text.includes("chat_messages") ||
      text.includes("discover_potential_buddies") || text.includes("buddy_profile")) &&
    (text.includes("does not exist") ||
      text.includes("could not find") ||
      text.includes("schema cache") ||
      text.includes("42p01") ||
      text.includes("pgrst205") ||
      text.includes("pgrst202"))
  );
}

export function otherPartyId(row: ConnectionRow, meId: string): string {
  return row.requester_id === meId ? row.addressee_id : row.requester_id;
}

const STALE_MS = 14 * 24 * 60 * 60 * 1000;

/** True when the last message on this connection is >= 2 weeks old (or none). */
export function isStaleConnection(
  row: ConnectionRow,
  latestMessageAt: string | null,
  now = Date.now(),
): boolean {
  if (row.status !== "active") return false;
  const anchor = latestMessageAt ?? row.updated_at;
  const t = new Date(anchor).getTime();
  if (!Number.isFinite(t)) return false;
  return now - t >= STALE_MS;
}

export async function loadOwnConnections(userId: string): Promise<
  { ok: true; rows: ConnectionRow[] } | { ok: false; message: string }
> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("connections")
        .select(CONN_COLS)
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .order("updated_at", { ascending: false }),
      "Loading connections",
    );
    if (error) throw error;
    return { ok: true, rows: (data as ConnectionRow[]) ?? [] };
  } catch (error) {
    if (looksLikeBuddiesBackendMissing(error))
      return { ok: false, message: COPY.buddiesNeedSql };
    return { ok: false, message: messageFromUnknown(error, COPY.buddiesLoadFailed) };
  }
}

export async function findPotentialBuddies(
  search: string | null,
  limit = 20,
): Promise<{ ok: true; rows: PotentialBuddyRow[] } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    const { data, error } = await withTimeout(
      supabase.rpc("discover_potential_buddies", {
        search: search?.trim() || null,
        limit_n: limit,
      }),
      "Finding buddies",
    );
    if (error) throw error;
    return { ok: true, rows: (data as PotentialBuddyRow[]) ?? [] };
  } catch (error) {
    if (looksLikeBuddiesBackendMissing(error))
      return { ok: false, message: COPY.buddiesNeedSql };
    return { ok: false, message: messageFromUnknown(error, COPY.buddiesLoadFailed) };
  }
}

export async function loadBuddyProfile(
  otherId: string,
): Promise<{ ok: true; row: BuddyProfile | null } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    const { data, error } = await withTimeout(
      supabase.rpc("buddy_profile", { other_id: otherId }),
      "Loading buddy",
    );
    if (error) throw error;
    const arr = (data as BuddyProfile[]) ?? [];
    return { ok: true, row: arr[0] ?? null };
  } catch (error) {
    if (looksLikeBuddiesBackendMissing(error))
      return { ok: false, message: COPY.buddiesNeedSql };
    return { ok: false, message: messageFromUnknown(error, COPY.buddiesLoadFailed) };
  }
}

export async function sendBuddyRequest(input: {
  requesterId: string;
  addresseeId: string;
  note?: string | null;
}): Promise<{ ok: true; row: ConnectionRow } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("connections")
        .insert({
          requester_id: input.requesterId,
          addressee_id: input.addresseeId,
          status: "requested",
          request_note: input.note?.trim() || null,
        })
        .select(CONN_COLS)
        .single(),
      "Sending request",
    );
    if (error) throw error;
    return { ok: true, row: data as ConnectionRow };
  } catch (error) {
    if (looksLikeBuddiesBackendMissing(error))
      return { ok: false, message: COPY.buddiesNeedSql };
    return { ok: false, message: messageFromUnknown(error, COPY.buddiesLoadFailed) };
  }
}

async function patchConnection(
  id: string,
  patch: { status: ConnectionStatus },
): Promise<{ ok: true; row: ConnectionRow } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("connections")
        .update(patch)
        .eq("id", id)
        .select(CONN_COLS)
        .single(),
      "Updating connection",
    );
    if (error) throw error;
    return { ok: true, row: data as ConnectionRow };
  } catch (error) {
    if (looksLikeBuddiesBackendMissing(error))
      return { ok: false, message: COPY.buddiesNeedSql };
    return { ok: false, message: messageFromUnknown(error, COPY.buddiesLoadFailed) };
  }
}

export const acceptConnection = (id: string) =>
  patchConnection(id, { status: "active" });
export const declineConnection = (id: string) =>
  patchConnection(id, { status: "declined" });
export const archiveConnection = (id: string) =>
  patchConnection(id, { status: "inactive" });
export const reactivateConnection = (id: string) =>
  patchConnection(id, { status: "active" });

export async function loadMessages(
  connectionId: string,
  limit = 200,
): Promise<{ ok: true; rows: ChatMessageRow[] } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("chat_messages")
        .select(CHAT_COLS)
        .eq("connection_id", connectionId)
        .order("created_at", { ascending: true })
        .limit(limit),
      "Loading messages",
    );
    if (error) throw error;
    return { ok: true, rows: (data as ChatMessageRow[]) ?? [] };
  } catch (error) {
    if (looksLikeBuddiesBackendMissing(error))
      return { ok: false, message: COPY.buddiesNeedSql };
    return { ok: false, message: messageFromUnknown(error, COPY.buddiesLoadFailed) };
  }
}

export async function sendMessage(input: {
  connectionId: string;
  senderId: string;
  body: string;
}): Promise<{ ok: true; row: ChatMessageRow } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  const body = input.body.trim();
  if (!body) return { ok: false, message: "Type a message first." };
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("chat_messages")
        .insert({
          connection_id: input.connectionId,
          sender_id: input.senderId,
          body,
        })
        .select(CHAT_COLS)
        .single(),
      "Sending message",
    );
    if (error) throw error;
    // Fire-and-forget push. Ignoring failure here keeps chat responsive
    // when the Edge Function isn't deployed yet.
    void triggerChatPush(input.connectionId, body);
    return { ok: true, row: data as ChatMessageRow };
  } catch (error) {
    if (looksLikeBuddiesBackendMissing(error))
      return { ok: false, message: COPY.buddiesNeedSql };
    return { ok: false, message: messageFromUnknown(error, COPY.buddiesLoadFailed) };
  }
}

async function triggerChatPush(connectionId: string, preview: string) {
  try {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) return;
    await supabase.functions.invoke("send-chat-push", {
      body: {
        connection_id: connectionId,
        preview: preview.slice(0, 120),
      },
    });
  } catch {
    // Edge Function may not be deployed yet — silent fallback.
  }
}
