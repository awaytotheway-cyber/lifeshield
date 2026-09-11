/**
 * Own lab rows from public.test_results (RLS: user can read their rows).
 * Status chips lead. Raw numbers stay on the detail screen.
 */
import { COPY } from "@/lib/copy";
import { messageFromUnknown } from "@/lib/friendly-errors";
import type { ResultFlag } from "@/lib/result-entry";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export {
  meaningForFlag,
  statusChipFromFlag,
  type ResultStatusChip,
  type ResultStatusTone,
} from "@/lib/result-status";

export type TestResultRow = {
  id: string;
  user_id: string;
  test_order_id: string | null;
  test_name: string;
  plain_name: string | null;
  result_value: string | null;
  result_unit: string | null;
  reference_range: string | null;
  flag: ResultFlag | string | null;
  lab_report_url: string | null;
  clinician_reviewed: boolean | null;
  created_at: string;
};

export type LoadTestResultsOutcome =
  | { ok: true; rows: TestResultRow[] }
  | { ok: false; rows: []; message: string };

const RESULT_COLUMNS =
  "id, user_id, test_order_id, test_name, plain_name, result_value, result_unit, reference_range, flag, lab_report_url, clinician_reviewed, created_at";

export async function loadOwnTestResults(
  userId: string,
): Promise<LoadTestResultsOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, rows: [], message: COPY.missingKeys };
  }
  try {
    const { data, error } = await supabase
      .from("test_results")
      .select(RESULT_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      throw error;
    }
    return { ok: true, rows: (data as TestResultRow[]) ?? [] };
  } catch (error) {
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(error, COPY.labResultsLoadFailed),
    };
  }
}

export async function loadOwnTestResultById(
  userId: string,
  resultId: string,
): Promise<LoadTestResultsOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, rows: [], message: COPY.missingKeys };
  }
  try {
    const { data, error } = await supabase
      .from("test_results")
      .select(RESULT_COLUMNS)
      .eq("user_id", userId)
      .eq("id", resultId)
      .maybeSingle();
    if (error) {
      throw error;
    }
    return { ok: true, rows: data ? [data as TestResultRow] : [] };
  } catch (error) {
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(error, COPY.labResultDetailLoadFailed),
    };
  }
}

export async function hasOwnTestResults(userId: string): Promise<{
  ok: boolean;
  hasRows: boolean;
  message?: string;
}> {
  if (!isSupabaseConfigured) {
    return { ok: false, hasRows: false, message: COPY.missingKeys };
  }
  try {
    const { count, error } = await supabase
      .from("test_results")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) {
      throw error;
    }
    return { ok: true, hasRows: (count ?? 0) > 0 };
  } catch (error) {
    return {
      ok: false,
      hasRows: false,
      message: messageFromUnknown(error, COPY.labResultsLoadFailed),
    };
  }
}
