/**
 * Admin-only lab result entry.
 *
 * The phone never writes straight to test_results with a table insert.
 * It tries the save-reviewed-result Edge Function first.
 * If that never reaches a working function (common on localhost:8081),
 * it falls back to the save_reviewed_result Postgres function.
 * Both checks use the signed-in person's login token + admin email.
 * The service-role key stays on the server — never here, never in .env.
 */
import { z } from "zod";

import { isAdminEmail } from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { messageFromUnknown, rawErrorText } from "@/lib/friendly-errors";
import { TERMS, type TermKey } from "@/lib/plain-language";
import {
  looksLikeMissingRpc,
  looksLikeUnreachableFunction,
} from "@/lib/result-entry-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export {
  looksLikeMissingRpc,
  looksLikeUnreachableFunction,
} from "@/lib/result-entry-errors";

/** Must match public.test_results.flag CHECK. */
export const RESULT_FLAGS = [
  "normal",
  "low",
  "high",
  "critical",
  "positive",
  "negative",
] as const;

export type ResultFlag = (typeof RESULT_FLAGS)[number];

/** Tests an admin can pick. Dictionary keys so ClinicalTerm can render them. */
export const RESULT_ENTRY_TERM_KEYS = [
  "brca",
  "ctc",
  "snp",
  "routineBloods",
  "thyroid",
  "fastingInsulin",
  "salivaryCortisol",
  "b12FolateFerritin",
  "dutch",
  "stool",
  "urinaryIodine",
  "heavyMetals",
  "cyp450",
] as const satisfies readonly TermKey[];

export type ResultEntryTermKey = (typeof RESULT_ENTRY_TERM_KEYS)[number];

export const RESULT_ENTRY_TEST_OPTIONS = RESULT_ENTRY_TERM_KEYS.map((key) => ({
  value: key,
  label: `${TERMS[key].plainName} — ${TERMS[key].medicalName}`,
}));

export const RESULT_FLAG_OPTIONS = [
  { value: "normal", label: "Within the usual range (normal)" },
  { value: "low", label: "Lower than the usual range (low)" },
  { value: "high", label: "Higher than the usual range (high)" },
  { value: "critical", label: "Needs prompt clinician attention (critical)" },
  { value: "positive", label: "Reported as positive" },
  { value: "negative", label: "Reported as negative" },
] as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionalUuidField(label: string) {
  return z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .refine(
      (value) => value === null || UUID_RE.test(value),
      `Enter a valid ${label}, or leave it blank`,
    );
}

export const resultEntrySchema = z.object({
  test_name: z
    .string()
    .trim()
    .min(1, "Please choose a test")
    .refine(
      (value) =>
        (RESULT_ENTRY_TERM_KEYS as readonly string[]).includes(value),
      "Please choose a test from the list",
    ),
  plain_name: z.string().trim(),
  result_value: z.string().trim().min(1, "Enter the result value"),
  result_unit: z.string().trim(),
  reference_range: z.string().trim(),
  flag: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .refine(
      (value) =>
        value === null ||
        (RESULT_FLAGS as readonly string[]).includes(value),
      "Choose a flag from the list, or leave it blank",
    ),
  user_id: z
    .string()
    .trim()
    .min(1, "Enter whose results these are")
    .refine((value) => UUID_RE.test(value), "Enter a valid user id"),
  test_order_id: optionalUuidField("suggestion id"),
});

export type ResultEntryForm = {
  test_name: string;
  plain_name: string;
  result_value: string;
  result_unit: string;
  reference_range: string;
  flag: string;
  user_id: string;
  test_order_id: string;
};

export type ResultEntryParsed = z.output<typeof resultEntrySchema>;

export type ResultRecordPayload = {
  user_id: string;
  test_name: string;
  plain_name: string | null;
  result_value: string | null;
  result_unit: string | null;
  reference_range: string | null;
  flag: ResultFlag | null;
  test_order_id: string | null;
};

export function emptyResultEntry(userId: string): ResultEntryForm {
  return {
    test_name: "",
    plain_name: "",
    result_value: "",
    result_unit: "",
    reference_range: "",
    flag: "",
    user_id: userId,
    test_order_id: "",
  };
}

export function plainNameForTerm(termKey: string): string {
  if ((RESULT_ENTRY_TERM_KEYS as readonly string[]).includes(termKey)) {
    return TERMS[termKey as ResultEntryTermKey].plainName;
  }
  return "";
}

function blankToNull(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function recordFromParsed(values: ResultEntryParsed): ResultRecordPayload {
  const termKey = values.test_name as ResultEntryTermKey;
  return {
    user_id: values.user_id,
    test_name: values.test_name,
    plain_name:
      blankToNull(values.plain_name) ?? TERMS[termKey].plainName,
    result_value: blankToNull(values.result_value),
    result_unit: blankToNull(values.result_unit),
    reference_range: blankToNull(values.reference_range),
    flag: values.flag as ResultFlag | null,
    test_order_id: values.test_order_id,
  };
}

export type SaveResultOutcome = {
  ok: boolean;
  message?: string;
  notDeployed?: boolean;
};

function readInvokeStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  const record = error as {
    context?: { status?: unknown };
    status?: unknown;
  };
  if (typeof record.context?.status === "number") {
    return record.context.status;
  }
  if (typeof record.status === "number") {
    return record.status;
  }
  return undefined;
}

function messageFromFunctionBody(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const record = data as { error?: unknown; message?: unknown };
  if (typeof record.error === "string" && record.error.trim()) {
    return record.error.trim();
  }
  if (typeof record.message === "string" && record.message.trim()) {
    return record.message.trim();
  }
  return null;
}

function rpcArgsFromRecord(record: ResultRecordPayload) {
  return {
    p_user_id: record.user_id,
    p_test_name: record.test_name,
    p_plain_name: record.plain_name,
    p_result_value: record.result_value,
    p_result_unit: record.result_unit,
    p_reference_range: record.reference_range,
    p_flag: record.flag,
    p_test_order_id: record.test_order_id,
  };
}

function forbiddenFromText(text: string | null | undefined): boolean {
  const lower = (text ?? "").toLowerCase();
  return (
    lower.includes("not allowed") ||
    lower.includes("not allowed to enter") ||
    lower.includes("42501")
  );
}

/**
 * Tries the SQL helper when the Edge Function never answered.
 * Still uses the signed-in JWT. No service-role key on the phone.
 */
async function saveReviewedResultViaRpc(
  record: ResultRecordPayload,
): Promise<SaveResultOutcome> {
  try {
    const { error } = await supabase.rpc(
      "save_reviewed_result",
      rpcArgsFromRecord(record),
    );
    if (error) {
      if (looksLikeMissingRpc(error)) {
        return {
          ok: false,
          notDeployed: true,
          message: COPY.enterResultsNeedFunctionAndRpc,
        };
      }
      if (forbiddenFromText(rawErrorText(error))) {
        return { ok: false, message: COPY.enterResultsForbidden };
      }
      return {
        ok: false,
        message: messageFromUnknown(error, COPY.enterResultsSaveFailed),
      };
    }
    return { ok: true, message: COPY.enterResultsSaved };
  } catch (error) {
    if (looksLikeMissingRpc(error)) {
      return {
        ok: false,
        notDeployed: true,
        message: COPY.enterResultsNeedFunctionAndRpc,
      };
    }
    return {
      ok: false,
      message: messageFromUnknown(error, COPY.enterResultsSaveFailed),
    };
  }
}

/**
 * Sends one reviewed result.
 * 1) Edge Function (optional)
 * 2) If invoke never reached a working function → Postgres RPC
 * Uses the signed-in session. Never uses a service-role key.
 */
export async function saveReviewedResult(
  record: ResultRecordPayload,
  callerEmail: string | null | undefined,
): Promise<SaveResultOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }
  if (!isAdminEmail(callerEmail)) {
    return { ok: false, message: COPY.enterResultsForbidden };
  }

  try {
    const { data, error } = await supabase.functions.invoke(
      "save-reviewed-result",
      { body: { record } },
    );

    const status = readInvokeStatus(error);
    if (error) {
      const fromBody = messageFromFunctionBody(data);
      if (forbiddenFromText(fromBody) || forbiddenFromText(rawErrorText(error))) {
        if (status === 401 || status === 403) {
          return { ok: false, message: COPY.enterResultsForbidden };
        }
      }
      if (looksLikeUnreachableFunction(error, status) || looksLikeUnreachableFunction(fromBody)) {
        return saveReviewedResultViaRpc(record);
      }
      if (fromBody?.toLowerCase().includes("not allowed")) {
        return { ok: false, message: COPY.enterResultsForbidden };
      }
      return {
        ok: false,
        message: messageFromUnknown(error, fromBody ?? COPY.enterResultsSaveFailed),
      };
    }

    const bodyError = messageFromFunctionBody(data);
    if (bodyError) {
      if (looksLikeUnreachableFunction(bodyError)) {
        return saveReviewedResultViaRpc(record);
      }
      if (forbiddenFromText(bodyError)) {
        return { ok: false, message: COPY.enterResultsForbidden };
      }
      return { ok: false, message: bodyError };
    }

    return { ok: true, message: COPY.enterResultsSaved };
  } catch (error) {
    if (looksLikeUnreachableFunction(error)) {
      return saveReviewedResultViaRpc(record);
    }
    return {
      ok: false,
      message: messageFromUnknown(error, COPY.enterResultsSaveFailed),
    };
  }
}

type CsvRow = Record<string, string>;

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

export function parseResultCsv(raw: string): {
  rows: CsvRow[];
  error?: string;
} {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) {
    return { rows: [], error: COPY.enterResultsCsvEmpty };
  }
  const headers = splitCsvLine(lines[0]).map((header) =>
    header.toLowerCase().replace(/\s+/g, "_"),
  );
  if (!headers.includes("test_name")) {
    return {
      rows: [],
      error: "CSV needs a test_name column in the first row.",
    };
  }
  const rows: CsvRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });
    rows.push(row);
  }
  return { rows };
}

export function formFromCsvRow(
  row: CsvRow,
  fallbackUserId: string,
): ResultEntryForm {
  return {
    test_name: (row.test_name ?? "").trim(),
    plain_name: (row.plain_name ?? "").trim(),
    result_value: (row.result_value ?? "").trim(),
    result_unit: (row.result_unit ?? "").trim(),
    reference_range: (row.reference_range ?? "").trim(),
    flag: (row.flag ?? "").trim(),
    user_id: (row.user_id ?? "").trim() || fallbackUserId,
    test_order_id: (row.test_order_id ?? "").trim(),
  };
}
