/**
 * Buddy client logic: the pure helpers the Buddies screens read, plus thin
 * wrappers over the Supabase tables and RPCs behind them.
 *
 * WHAT A BUDDY CAN SEE: display name, city and interests. That is the whole
 * surface. Nothing here reads the assessment, triage, results, orders or
 * email, and nothing here should grow a column that does.
 *
 * SCHEMA (verified against the live project):
 *   profiles      is_buddy_discoverable, buddy_display_name, city, interests
 *   connections   DIRECTIONAL — requester_id -> addressee_id, status
 *                 'requested' | 'active' | 'declined' | 'inactive'.
 *                 There is no ordered (user_a, user_b) pair; who asked whom
 *                 is the whole point, because it decides Accept vs Requested.
 *   chat_messages id, connection_id, sender_id, body, created_at
 *   blocks        blocker_id, blocked_id
 *   reports       reporter_id, target_kind, target_id, reason, status
 *
 * Discovery and connected-profile reads go through RPCs that already exist
 * server-side (discover_potential_buddies, buddy_profile). They enforce the
 * two-character search minimum, escape ILIKE metacharacters, and exclude the
 * caller, non-discoverable people, existing connections and blocked pairs.
 * None of that is re-implemented here — a second copy would drift.
 *
 * The Supabase client is loaded with a dynamic import (as lib/data-export.ts
 * does) so that importing this module costs nothing until a wrapper is
 * actually called, and so the pure half above stays testable under plain
 * node — a static `@/lib/supabase` import pulls in react-native.
 */
import { messageFromUnknown } from "@/lib/friendly-errors";

// ---------------------------------------------------------------- types

/** A row from discover_potential_buddies() — someone you are not connected to. */
export type BuddyMatch = {
  user_id: string;
  display_name: string;
  city: string | null;
  interests: string[];
  /** Interests you and they share. Drives the match score. */
  shared_interests: string[];
  /** 0–100, Jaccard overlap of interests, rounded. */
  match_score: number;
};

/**
 * A row from buddy_profile() — someone you ALREADY have a connection with.
 *
 * The same three shareable fields `BuddyMatch` carries, without the match
 * score: once you are connected there is nothing to score. `connections`
 * holds ids and nothing else, so this is the only way a buddy row or a chat
 * header learns the name to print above it.
 */
export type BuddyProfile = {
  user_id: string;
  display_name: string;
  city: string | null;
  interests: string[];
};

export type ConnectionStatus = "requested" | "active" | "declined" | "inactive";

/** A row from public.connections. Directional: requester_id asked addressee_id. */
export type Connection = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: ConnectionStatus;
  request_note: string | null;
  created_at: string;
  updated_at: string;
};

export type ConnectionRole = "requester" | "addressee" | "none";

/** What the UI should offer for a connection, from my side of it. */
export type ConnectionView =
  | "incoming_request"
  | "outgoing_request"
  | "active"
  | "none";

export type ReportTargetKind = "user" | "message";

// ------------------------------------------------------- pure functions

/** The separator between the parts of a buddy subtitle. */
const SEPARATOR = " · ";

/** Last-resort display name. Matches the SQL fallback. */
const FALLBACK_NAME = "Buddy";

/**
 * The name a buddy is shown under: their chosen buddy name, else the first
 * word of their full name, else "Buddy". Mirrors the coalesce in
 * discover_potential_buddies() and buddy_profile(), so a locally-held
 * profiles row renders the same name the RPCs return.
 *
 * Never returns an empty string, so a blank name can never reach the UI or a
 * profile write. A surname is never returned — only the first word.
 *
 * (One deliberate difference from the SQL: a full_name with leading
 * whitespace is trimmed first, where split_part would return an empty first
 * part and fall through to "Buddy". Names are trimmed on save, so real rows
 * cannot tell the two apart, and trimming is the kinder of the two.)
 */
export function displayNameFrom(
  buddyDisplayName: string | null,
  fullName: string | null,
): string {
  const chosen = (buddyDisplayName ?? "").trim();
  if (chosen.length > 0) return chosen;

  const firstWord = (fullName ?? "").trim().split(/\s+/)[0] ?? "";
  if (firstWord.length > 0) return firstWord;

  return FALLBACK_NAME;
}

/**
 * The two fields a subtitle is built from. Both `BuddyMatch` (discovery) and
 * `BuddyProfile` (someone you are connected to) satisfy it, so one subtitle
 * function serves the search results and the buddy rows alike.
 */
export type BuddyDescribable = Pick<BuddyMatch, "city" | "interests">;

/**
 * The subtitle under a buddy's name — `"Mumbai · walking, 40s"`.
 *
 * Absent parts are dropped rather than rendered empty, so there is never a
 * leading, trailing or doubled separator. Returns `""` when there is nothing
 * to say, which lets a caller skip the line entirely instead of rendering a
 * blank one.
 */
export function describeBuddy(b: BuddyDescribable): string {
  const parts: string[] = [];

  const city = (b.city ?? "").trim();
  if (city.length > 0) parts.push(city);

  const interests = (b.interests ?? [])
    .map((interest) => (interest ?? "").trim())
    .filter((interest) => interest.length > 0);
  if (interests.length > 0) parts.push(interests.join(", "));

  // Joining only the parts that exist is what keeps the separator honest.
  return parts.join(SEPARATOR);
}

/** Which end of a connection I am on. "none" if it is not mine at all. */
export function connectionRole(c: Connection, meId: string): ConnectionRole {
  const me = (meId ?? "").trim();
  if (me.length === 0) return "none";
  if (c.requester_id === me) return "requester";
  if (c.addressee_id === me) return "addressee";
  return "none";
}

/**
 * How a connection reads from my side.
 *
 * A 'requested' connection where I am the addressee is INCOMING — they asked
 * me, so the UI offers "Accept". Where I am the requester it is OUTGOING —
 * I asked them, so the UI shows "Requested" and no action. Getting these the
 * wrong way round would let someone accept their own request.
 *
 * 'declined' and 'inactive' are not actionable states, so they read as
 * "none" — as does a connection between two other people, or any status the
 * client does not recognise.
 */
export function connectionStatusFor(c: Connection, meId: string): ConnectionView {
  const role = connectionRole(c, meId);
  if (role === "none") return "none";
  if (c.status === "active") return "active";
  if (c.status === "requested") {
    return role === "addressee" ? "incoming_request" : "outgoing_request";
  }
  return "none";
}

/**
 * Whether chat is open. Only an active connection may be messaged — a
 * pending request is not a conversation. RLS enforces the same rule on
 * chat_messages; this only keeps the UI from offering what the database
 * would refuse.
 */
export function canMessage(c: Connection | null): boolean {
  return c != null && c.status === "active";
}

// ------------------------------------------------- Supabase wrappers

const CONNECTION_COLUMNS =
  "id, requester_id, addressee_id, status, request_note, created_at, updated_at";

const DEFAULT_DISCOVER_LIMIT = 20;

type SupabaseModule = typeof import("@/lib/supabase");

let supabaseModulePromise: Promise<SupabaseModule> | null = null;

function loadSupabase(): Promise<SupabaseModule> {
  supabaseModulePromise ??= import("@/lib/supabase");
  return supabaseModulePromise;
}

export type DiscoverBuddiesOutcome =
  | { ok: true; rows: BuddyMatch[] }
  | { ok: false; rows: []; message: string };

export type LoadBuddyProfilesOutcome =
  | { ok: true; rows: BuddyProfile[] }
  | { ok: false; rows: []; message: string };

export type LoadConnectionsOutcome =
  | { ok: true; rows: Connection[] }
  | { ok: false; rows: []; message: string };

export type BuddyWriteOutcome =
  | { ok: true }
  | { ok: false; message: string };

export type RequestConnectionOutcome =
  | { ok: true; connectionId: string }
  | { ok: false; message: string };

/** The signed-in user's id, or null when there is no session. */
async function currentUserId(): Promise<string | null> {
  const { supabase } = await loadSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function normaliseMatch(row: Record<string, unknown>): BuddyMatch {
  return {
    user_id: String(row.user_id ?? ""),
    display_name: displayNameFrom(
      typeof row.display_name === "string" ? row.display_name : null,
      null,
    ),
    city: typeof row.city === "string" ? row.city : null,
    interests: Array.isArray(row.interests) ? (row.interests as string[]) : [],
    shared_interests: Array.isArray(row.shared_interests)
      ? (row.shared_interests as string[])
      : [],
    match_score: Number(row.match_score ?? 0),
  };
}

function normaliseProfile(row: Record<string, unknown>): BuddyProfile {
  return {
    user_id: String(row.user_id ?? ""),
    display_name: displayNameFrom(
      typeof row.display_name === "string" ? row.display_name : null,
      null,
    ),
    city: typeof row.city === "string" ? row.city : null,
    interests: Array.isArray(row.interests) ? (row.interests as string[]) : [],
  };
}

/**
 * People you could connect with. An empty or absent `search` browses — the
 * board is populated before you type — and the RPC caps the result either
 * way. A one-character search returns nothing by design, server-side.
 */
export async function discoverBuddies(
  search?: string,
  limit: number = DEFAULT_DISCOVER_LIMIT,
): Promise<DiscoverBuddiesOutcome> {
  const { isSupabaseConfigured, supabase } = await loadSupabase();
  if (!isSupabaseConfigured) return { ok: true, rows: [] };

  try {
    const { data, error } = await supabase.rpc("discover_potential_buddies", {
      search: (search ?? "").trim() || null,
      limit_n: limit,
    });
    if (error) {
      return {
        ok: false,
        rows: [],
        message: messageFromUnknown(error, "We couldn't load buddies just now."),
      };
    }
    const rows = Array.isArray(data) ? data : [];
    return { ok: true, rows: rows.map(normaliseMatch) };
  } catch (error: unknown) {
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(error, "We couldn't load buddies just now."),
    };
  }
}

/**
 * Every connection I am part of, in either direction and at any status.
 * The caller sorts the rows into incoming, outgoing and active with
 * `connectionStatusFor`.
 *
 * The user filter is explicit on purpose. RLS does restrict the table to
 * rows I am on — but there is also a `conn_admin_read` policy, so for an
 * admin-staff account an unfiltered select would return every connection in
 * the product onto their own Buddies screen. "My buddies" has to mean mine
 * for everyone.
 */
export async function loadMyConnections(): Promise<LoadConnectionsOutcome> {
  const { isSupabaseConfigured, supabase } = await loadSupabase();
  if (!isSupabaseConfigured) return { ok: true, rows: [] };

  const meId = await currentUserId();
  if (!meId) return { ok: true, rows: [] };

  try {
    const { data, error } = await supabase
      .from("connections")
      .select(CONNECTION_COLUMNS)
      .or(`requester_id.eq.${meId},addressee_id.eq.${meId}`)
      .order("created_at", { ascending: false });
    if (error) {
      return {
        ok: false,
        rows: [],
        message: messageFromUnknown(
          error,
          "We couldn't load your buddies just now.",
        ),
      };
    }
    return { ok: true, rows: (data ?? []) as Connection[] };
  } catch (error: unknown) {
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(
        error,
        "We couldn't load your buddies just now.",
      ),
    };
  }
}

/**
 * The shareable profiles of people I am already connected to, keyed by nothing
 * — the caller matches them up by `user_id`.
 *
 * `connections` stores two ids and a status: no name, no city. So a buddy row
 * and a chat header have nothing to print until this runs. buddy_profile() is
 * SECURITY DEFINER and serves ONLY a user I have a connection with (active or
 * requested), which is why discovery's RPC cannot answer this question and
 * a direct `profiles` select cannot either — RLS keeps that to my own row.
 *
 * One call per id, because the function takes one id. They are issued together
 * and settled independently: a buddy whose profile fails to load is omitted
 * from `rows` rather than failing the whole screen, and the caller falls back
 * to `displayNameFrom(null, null)`. `ok` is false only when every id failed,
 * so a screen can tell "one name missing" from "this is not working".
 */
export async function loadBuddyProfiles(
  ids: string[],
): Promise<LoadBuddyProfilesOutcome> {
  const wanted = [...new Set((ids ?? []).map((id) => (id ?? "").trim()))].filter(
    (id) => id.length > 0,
  );
  if (wanted.length === 0) return { ok: true, rows: [] };

  const { isSupabaseConfigured, supabase } = await loadSupabase();
  if (!isSupabaseConfigured) return { ok: true, rows: [] };

  let firstFailure: string | null = null;

  const settled = await Promise.all(
    wanted.map(async (id): Promise<BuddyProfile | null> => {
      try {
        const { data, error } = await supabase.rpc("buddy_profile", {
          other_id: id,
        });
        if (error) {
          firstFailure ??= messageFromUnknown(
            error,
            "We couldn't load your buddy's details.",
          );
          return null;
        }
        const row = Array.isArray(data) ? data[0] : data;
        if (row == null) return null;
        return normaliseProfile(row as Record<string, unknown>);
      } catch (error: unknown) {
        firstFailure ??= messageFromUnknown(
          error,
          "We couldn't load your buddy's details.",
        );
        return null;
      }
    }),
  );

  const rows = settled.filter((row): row is BuddyProfile => row != null);
  if (rows.length === 0 && firstFailure) {
    return { ok: false, rows: [], message: firstFailure };
  }
  return { ok: true, rows };
}

/**
 * Ask someone to be a buddy. Always inserted as 'requested' with me as the
 * requester — RLS refuses anything else, and refuses an addressee who is not
 * discoverable or who has blocked me.
 */
export async function requestConnection(
  addresseeId: string,
  note?: string,
): Promise<RequestConnectionOutcome> {
  const { isSupabaseConfigured, supabase } = await loadSupabase();
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Connect Supabase to send a buddy request." };
  }

  const meId = await currentUserId();
  if (!meId) {
    return { ok: false, message: "Please sign in again to send a request." };
  }
  if (addresseeId === meId) {
    return { ok: false, message: "You can't send yourself a buddy request." };
  }

  try {
    const { data, error } = await supabase
      .from("connections")
      .insert({
        requester_id: meId,
        addressee_id: addresseeId,
        status: "requested",
        request_note: (note ?? "").trim() || null,
      })
      .select("id")
      .single();
    if (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, "We couldn't send that request."),
      };
    }
    return { ok: true, connectionId: String(data?.id ?? "") };
  } catch (error: unknown) {
    return {
      ok: false,
      message: messageFromUnknown(error, "We couldn't send that request."),
    };
  }
}

/**
 * Accept an incoming request. Scoped to `addressee_id = me` so a requester
 * can never accept their own request even if a caller passes the wrong id.
 */
export async function acceptConnection(
  connectionId: string,
): Promise<BuddyWriteOutcome> {
  const { isSupabaseConfigured, supabase } = await loadSupabase();
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Connect Supabase to accept a request." };
  }

  const meId = await currentUserId();
  if (!meId) {
    return { ok: false, message: "Please sign in again to accept a request." };
  }

  try {
    const { data, error } = await supabase
      .from("connections")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", connectionId)
      .eq("addressee_id", meId)
      .eq("status", "requested")
      .select("id");
    if (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, "We couldn't accept that request."),
      };
    }
    if (!data || data.length === 0) {
      return {
        ok: false,
        message: "That request is no longer waiting for you.",
      };
    }
    return { ok: true };
  } catch (error: unknown) {
    return {
      ok: false,
      message: messageFromUnknown(error, "We couldn't accept that request."),
    };
  }
}

/**
 * Block someone. The database treats a block as symmetric: once a row
 * exists, discovery, connections and chat all stop working in both
 * directions, so there is nothing further to tear down here.
 */
export async function blockUser(blockedId: string): Promise<BuddyWriteOutcome> {
  const { isSupabaseConfigured, supabase } = await loadSupabase();
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Connect Supabase to block someone." };
  }

  const meId = await currentUserId();
  if (!meId) {
    return { ok: false, message: "Please sign in again to block someone." };
  }
  if (blockedId === meId) {
    return { ok: false, message: "You can't block yourself." };
  }

  try {
    const { error } = await supabase
      .from("blocks")
      .upsert(
        { blocker_id: meId, blocked_id: blockedId },
        { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
      );
    if (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, "We couldn't block that person."),
      };
    }
    return { ok: true };
  } catch (error: unknown) {
    return {
      ok: false,
      message: messageFromUnknown(error, "We couldn't block that person."),
    };
  }
}

/**
 * Report a person or a message. Opens at status 'open'; only admin staff can
 * read or move a report after that.
 */
export async function reportUser(
  targetKind: ReportTargetKind,
  targetId: string,
  reason: string,
): Promise<BuddyWriteOutcome> {
  const { isSupabaseConfigured, supabase } = await loadSupabase();
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Connect Supabase to send a report." };
  }

  const trimmedReason = (reason ?? "").trim();
  if (trimmedReason.length === 0) {
    return { ok: false, message: "Please tell us what went wrong." };
  }

  const meId = await currentUserId();
  if (!meId) {
    return { ok: false, message: "Please sign in again to send a report." };
  }

  try {
    const { error } = await supabase.from("reports").insert({
      reporter_id: meId,
      target_kind: targetKind,
      target_id: targetId,
      reason: trimmedReason,
      status: "open",
    });
    if (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, "We couldn't send that report."),
      };
    }
    return { ok: true };
  } catch (error: unknown) {
    return {
      ok: false,
      message: messageFromUnknown(error, "We couldn't send that report."),
    };
  }
}
