/**
 * Export the signed-in user's own rows as JSON (RLS-scoped selects only).
 * Share via the system sheet when expo-sharing is available.
 */
import { Platform } from "react-native";

import { COPY } from "@/lib/copy";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const USER_TABLES: { table: string; userColumn: "user_id" | "id" }[] = [
  { table: "profiles", userColumn: "id" },
  { table: "triage_responses", userColumn: "user_id" },
  { table: "consent_records", userColumn: "user_id" },
  { table: "questionnaire_responses", userColumn: "user_id" },
  { table: "test_orders", userColumn: "user_id" },
  { table: "test_results", userColumn: "user_id" },
  { table: "interventions", userColumn: "user_id" },
  { table: "follow_ups", userColumn: "user_id" },
  { table: "orders", userColumn: "user_id" },
  { table: "push_tokens", userColumn: "user_id" },
  { table: "account_deletion_requests", userColumn: "user_id" },
];

export type ExportResult =
  | { ok: true; fileUri: string; shared: boolean }
  | { ok: false; message: string };

async function fetchTable(
  table: string,
  userColumn: "user_id" | "id",
  userId: string,
): Promise<{ table: string; rows: unknown[]; skipped?: string }> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq(userColumn, userId);
    if (error) {
      return {
        table,
        rows: [],
        skipped: error.message,
      };
    }
    return { table, rows: data ?? [] };
  } catch (error) {
    return {
      table,
      rows: [],
      skipped: messageFromUnknown(error, "unavailable"),
    };
  }
}

export async function exportOwnData(userId: string): Promise<ExportResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }

  try {
    const chunks = await Promise.all(
      USER_TABLES.map((item) =>
        fetchTable(item.table, item.userColumn, userId),
      ),
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
          chunk.skipped
            ? { error: chunk.skipped, rows: [] }
            : { rows: chunk.rows },
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
