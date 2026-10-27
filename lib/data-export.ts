/**
 * Export the signed-in user's own rows as JSON (RLS-scoped selects only).
 * Share via the system sheet when expo-sharing is available.
 */
import { Platform } from "react-native";

import { COPY } from "@/lib/copy";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

/**
 * One user's data footprint: every table that holds rows belonging to them,
 * and how their rows are found in each. The export reads this list, and an
 * account-deletion purge has to remove exactly what it names — so a
 * user-scoped table missing from here is a table that survives a deletion.
 *
 * `userColumns` names the column(s) carrying the user's id; a row matching in
 * ANY of them is theirs. One column is the ordinary case. Two exist because
 * some tables have no `user_id` at all: `connections` is directional
 * (requester_id -> addressee_id, because who asked whom decides Accept vs
 * Requested), so "my connections" is the union of both sides.
 *
 * `throughConnection` is for the one table that carries no column a user can
 * be matched on by itself. `chat_messages` has a `sender_id` and a
 * `connection_id`; its rows are reached by resolving the user's connection
 * ids first. See SHARED ROWS below for why it is the thread and not the
 * sender that decides.
 *
 * SHARED ROWS — what "this user's data" means where two people are involved:
 *
 *   connections      Both sides, by either column. A connection is one row
 *                    describing one relationship. Half of it is leaving, so
 *                    the row goes and it disappears from the other person's
 *                    list too. That is correct: they no longer have a buddy.
 *
 *   chat_messages    The WHOLE thread under each of those connections — not
 *                    only the messages this user sent. This is a judgement
 *                    call, made this way for two reasons.
 *
 *                    First, every read policy on chat_messages is an
 *                    `exists (... from connections ...)` over the parent row
 *                    (see 20261026_buddy_blocks_reports_and_search.sql). Once
 *                    the connection is deleted, surviving messages are rows
 *                    no account can ever read again — personal data retained
 *                    indefinitely and invisibly, which is the exact failure
 *                    this list exists to prevent.
 *
 *                    Second, it is what keeps the two halves honest. The
 *                    export hands the user the whole thread, because RLS lets
 *                    them read both sides of it. If the purge removed only
 *                    `sender_id = me`, the export would show them more than
 *                    the deletion takes away. The cost is that the other
 *                    person loses their own sent messages — but they were
 *                    losing the readable thread regardless.
 *
 *   blocks, reports  The user's own only, by `blocker_id` / `reporter_id`.
 *                    Rows where they are the TARGET were written by someone
 *                    else and are that person's data; both tables' FKs to
 *                    profiles already cascade, so those rows go when the
 *                    profile row does.
 */
type UserTable = {
  table: string;
  /** Any match is this user's row. Absent for `throughConnection` tables. */
  userColumns?: readonly [string, ...string[]];
  /** Column linking the row to a `connections` row this user is party to. */
  throughConnection?: string;
  /** Carried into the export beside the rows when a table needs a caveat. */
  note?: string;
};

const USER_TABLES: readonly UserTable[] = [
  { table: "profiles", userColumns: ["id"] },
  { table: "triage_responses", userColumns: ["user_id"] },
  { table: "consent_records", userColumns: ["user_id"] },
  { table: "questionnaire_responses", userColumns: ["user_id"] },
  { table: "test_orders", userColumns: ["user_id"] },
  { table: "test_results", userColumns: ["user_id"] },
  { table: "interventions", userColumns: ["user_id"] },
  { table: "follow_ups", userColumns: ["user_id"] },
  { table: "orders", userColumns: ["user_id"] },
  { table: "push_tokens", userColumns: ["user_id"] },
  { table: "account_deletion_requests", userColumns: ["user_id"] },
  { table: "connections", userColumns: ["requester_id", "addressee_id"] },
  {
    table: "chat_messages",
    throughConnection: "connection_id",
    note:
      "Every message in your buddy threads, from both sides. Deleting your account deletes the connection, and the whole thread with it.",
  },
  { table: "blocks", userColumns: ["blocker_id"] },
  {
    table: "reports",
    userColumns: ["reporter_id"],
    note:
      "Reports you filed are readable only by moderation staff, so this list is empty here even if you have filed some. Deleting your account still removes them.",
  },
];

export type ExportResult =
  | { ok: true; fileUri: string; shared: boolean }
  | { ok: false; message: string };

type TableChunk = {
  table: string;
  rows: unknown[];
  skipped?: string;
  note?: string;
};

/** The user's connection ids, or why they could not be read. */
type ConnectionIds = { ids: string[] } | { error: string };

/**
 * Resolves the connections this user is party to, from either side. Done once
 * per export so the tables hanging off a connection do not each repeat it.
 */
async function fetchConnectionIds(userId: string): Promise<ConnectionIds> {
  try {
    const { data, error } = await supabase
      .from("connections")
      .select("id")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    if (error) {
      return { error: error.message };
    }
    return {
      ids: (data ?? []).map((row) => String((row as { id: string }).id)),
    };
  } catch (error) {
    return { error: messageFromUnknown(error, "unavailable") };
  }
}

async function fetchTable(
  spec: UserTable,
  userId: string,
  connectionIds: ConnectionIds,
): Promise<TableChunk> {
  const { table, note } = spec;
  try {
    let query = supabase.from(table).select("*");

    if (spec.throughConnection) {
      if ("error" in connectionIds) {
        return { table, rows: [], skipped: connectionIds.error, note };
      }
      if (connectionIds.ids.length === 0) {
        return { table, rows: [], note };
      }
      query = query.in(spec.throughConnection, connectionIds.ids);
    } else if (!spec.userColumns) {
      // Unreachable: a spec is either column-matched or connection-scoped.
      // Reported rather than treated as "no rows", because a table silently
      // exporting nothing is the failure mode this list has to avoid.
      return { table, rows: [], skipped: "no user column configured", note };
    } else if (spec.userColumns.length === 1) {
      query = query.eq(spec.userColumns[0], userId);
    } else {
      query = query.or(
        spec.userColumns.map((column) => `${column}.eq.${userId}`).join(","),
      );
    }

    const { data, error } = await query;
    if (error) {
      return {
        table,
        rows: [],
        skipped: error.message,
        note,
      };
    }
    return { table, rows: data ?? [], note };
  } catch (error) {
    return {
      table,
      rows: [],
      skipped: messageFromUnknown(error, "unavailable"),
      note,
    };
  }
}

export async function exportOwnData(userId: string): Promise<ExportResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }

  try {
    // chat_messages is reached through the user's connections, so the ids
    // have to be in hand before the per-table reads fan out.
    const connectionIds = await fetchConnectionIds(userId);

    const chunks = await Promise.all(
      USER_TABLES.map((item) => fetchTable(item, userId, connectionIds)),
    );

    const payload = {
      exportedAt: new Date().toISOString(),
      product: "PRESCOPE",
      userId,
      note:
        "This file contains only rows your account can read under Row Level Security. Connections use HTTPS. This is not a medical record export from a clinic.",
      tables: Object.fromEntries(
        chunks.map((chunk) => [
          chunk.table,
          {
            ...(chunk.skipped
              ? { error: chunk.skipped, rows: [] }
              : { rows: chunk.rows }),
            // Only the tables that carry a caveat gain a key here, so the
            // shape of every table already in this file is unchanged.
            ...(chunk.note ? { note: chunk.note } : {}),
          },
        ]),
      ),
    };

    const json = JSON.stringify(payload, null, 2);
    const fileName = `prescope-export-${userId.slice(0, 8)}.json`;

    if (Platform.OS === "web") {
      // Browser download — no native share sheet.
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      return { ok: true, fileUri: url, shared: false };
    }

    // SDK 57: legacy write helpers live under /legacy (new File API is separate).
    const FileSystem = await import("expo-file-system/legacy");
    const dir =
      FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? null;
    if (!dir) {
      return { ok: false, message: COPY.privacyExportFailed };
    }
    const fileUri = `${dir}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    try {
      const Sharing = await import("expo-sharing");
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: COPY.privacyExportShareTitle,
          UTI: "public.json",
        });
        return { ok: true, fileUri, shared: true };
      }
    } catch {
      // File still written; sharing is optional.
    }

    return { ok: true, fileUri, shared: false };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, COPY.privacyExportFailed),
    };
  }
}

export async function requestAccountDeletion(
  userId: string,
  reason: string,
): Promise<{ ok: boolean; message?: string; needsSetup?: boolean }> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }

  try {
    const { error } = await supabase.from("account_deletion_requests").upsert(
      {
        user_id: userId,
        reason: reason.trim() || null,
        status: "pending",
        requested_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      const text = error.message?.toLowerCase() ?? "";
      if (
        text.includes("does not exist") ||
        text.includes("schema cache") ||
        text.includes("relation")
      ) {
        return {
          ok: false,
          needsSetup: true,
          message: COPY.privacyDeleteNeedsSql,
        };
      }
      throw error;
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, COPY.privacyDeleteFailed),
    };
  }
}
