/**
 * Follow-up list: re-tests, reviews, and the recurring symptom re-check.
 * Seeding is idempotent (same type + title will not create a second pending row).
 */
import { FOLLOW_UP_TIMING } from "@/lib/clinical-thresholds";
import { COPY } from "@/lib/copy";
import { messageFromUnknown, rawErrorText } from "@/lib/friendly-errors";
import { addDaysToIsoDate, todayIsoDate } from "@/lib/iso-date";
import { getTerm } from "@/lib/plain-language";
import { planRetests, type ResultForRetest } from "@/lib/retest-schedule";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export { addDaysToIsoDate, todayIsoDate };

export type FollowUpType =
  | "retest"
  | "review"
  | "symptom_check"
  | "coaching"
  | string;

export type FollowUpStatus =
  | "pending"
  | "completed"
  | "missed"
  | "rescheduled"
  | string;

export type FollowUpRow = {
  id: string;
  user_id: string;
  type: FollowUpType;
  title: string;
  plain_note: string | null;
  due_date: string;
  status: FollowUpStatus;
  created_at: string;
};

export type LoadFollowUpsOutcome =
  | { ok: true; rows: FollowUpRow[] }
  | { ok: false; rows: []; message: string };

export type SeedFollowUpsReason = "hub" | "plan";

export const FOLLOW_UP_TITLES = {
  symptomCheck: "Symptom re-check",
  planReview: "Draft plan review",
} as const;

const COLUMNS =
  "id, user_id, type, title, plain_note, due_date, status, created_at";

const MAX_RETEST_SEEDS = 6;

/** Stop endless spinners if Supabase never answers. */
const FOLLOW_UP_REQUEST_TIMEOUT_MS = 15_000;

function withTimeout<T>(
  promise: PromiseLike<T>,
  label: string,
  timeoutMs = FOLLOW_UP_REQUEST_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function looksLikeMissingTable(error: unknown): boolean {
  const text = rawErrorText(error).toLowerCase();
  return (
    (text.includes("follow_ups") &&
      (text.includes("does not exist") ||
        text.includes("could not find") ||
        text.includes("schema cache") ||
        text.includes("42p01"))) ||
    (text.includes("pgrst205") && text.includes("follow_ups"))
  );
}

function looksLikeFollowUpsBackendMissing(error: unknown): boolean {
  return looksLikeMissingTable(error) || looksLikeMissingRpc(error);
}

function looksLikeMissingRpc(error: unknown): boolean {
  const text = rawErrorText(error).toLowerCase();
  return (
    text.includes("pgrst202") ||
    (text.includes("ensure_follow_up") &&
      (text.includes("does not exist") ||
        text.includes("not find") ||
        text.includes("schema cache"))) ||
    (text.includes("complete_follow_up") &&
      (text.includes("does not exist") ||
        text.includes("not find") ||
        text.includes("schema cache"))) ||
    (text.includes("could not find the function") &&
      (text.includes("ensure_follow") || text.includes("complete_follow")))
  );
}

function looksLikeRlsBlock(error: unknown): boolean {
  const text = rawErrorText(error).toLowerCase();
  return (
    text.includes("row-level security") ||
    text.includes("42501") ||
    text.includes("permission denied") ||
    text.includes("violates row-level")
  );
}

export function nextSymptomDueDays(hadAnySymptomRow: boolean): number {
  return hadAnySymptomRow
    ? FOLLOW_UP_TIMING.symptomRecheckDays
    : FOLLOW_UP_TIMING.visibleDueDays;
}

export function sameFollowUpTitle(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function hasPendingDuplicate(
  rows: Pick<FollowUpRow, "type" | "title" | "status">[],
  type: FollowUpType,
  title: string,
): boolean {
  return rows.some(
    (row) =>
      row.type === type &&
      row.status === "pending" &&
      sameFollowUpTitle(row.title, title),
  );
}

export function hasAnyWithTitle(
  rows: Pick<FollowUpRow, "type" | "title">[],
  type: FollowUpType,
  title: string,
): boolean {
  return rows.some(
    (row) => row.type === type && sameFollowUpTitle(row.title, title),
  );
}

export function retestTitleForTest(testName: string): string {
  return `Re-test: ${getTerm(testName).plainName}`;
}

export function typeLabel(type: FollowUpType): string {
  switch (type) {
    case "symptom_check":
      return COPY.followUpTypeSymptom;
    case "retest":
      return COPY.followUpTypeRetest;
    case "review":
      return COPY.followUpTypeReview;
    case "coaching":
      return COPY.followUpTypeCoaching;
    default:
      return type;
  }
}

export async function loadOwnFollowUps(
  userId: string,
): Promise<LoadFollowUpsOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, rows: [], message: COPY.missingKeys };
  }
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("follow_ups")
        .select(COLUMNS)
        .eq("user_id", userId)
        .order("due_date", { ascending: true })
        .order("created_at", { ascending: true }),
      "Loading follow-ups",
    );
    if (error) {
      throw error;
    }
    return { ok: true, rows: (data as FollowUpRow[]) ?? [] };
  } catch (error) {
    if (looksLikeFollowUpsBackendMissing(error)) {
      return { ok: false, rows: [], message: COPY.followUpNeedSql };
    }
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(error, COPY.followUpLoadFailed),
    };
  }
}

async function insertFollowUp(
  userId: string,
  type: FollowUpType,
  title: string,
  plainNote: string,
  dueDate: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const payload = {
    user_id: userId,
    type,
    title,
    plain_note: plainNote,
    due_date: dueDate,
    status: "pending" as const,
  };
  try {
    const direct = await withTimeout(
      supabase.from("follow_ups").insert(payload),
      "Saving follow-up",
    );
    if (!direct.error) {
      return { ok: true };
    }
    if (
      !looksLikeRlsBlock(direct.error) &&
      !looksLikeMissingRpc(direct.error) &&
      !looksLikeMissingTable(direct.error)
    ) {
      throw direct.error;
    }

    const rpc = await withTimeout(
      supabase.rpc("ensure_follow_up", {
        p_user_id: userId,
        p_type: type,
        p_title: title,
        p_plain_note: plainNote,
        p_due_date: dueDate,
      }),
      "Saving follow-up (secure helper)",
    );
    if (!rpc.error) {
      return { ok: true };
    }
    if (looksLikeFollowUpsBackendMissing(rpc.error) || looksLikeRlsBlock(rpc.error)) {
      return { ok: false, message: COPY.followUpNeedSql };
    }
    throw rpc.error;
  } catch (error) {
    if (looksLikeFollowUpsBackendMissing(error) || looksLikeRlsBlock(error)) {
      return { ok: false, message: COPY.followUpNeedSql };
    }
    return {
      ok: false,
      message: messageFromUnknown(error, COPY.followUpSaveFailed),
    };
  }
}

async function loadResultsForRetest(userId: string): Promise<ResultForRetest[]> {
  const { data, error } = await supabase
    .from("test_results")
    .select("test_name, plain_name, flag, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return (data as ResultForRetest[]) ?? [];
}

async function hasDraftPlan(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("interventions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) {
    return false;
  }
  return (count ?? 0) > 0;
}

/**
 * Create a few useful upcoming rows. Never duplicates a pending type+title.
 */
export async function seedFollowUpsIfNeeded(
  userId: string,
  reason: SeedFollowUpsReason = "hub",
): Promise<LoadFollowUpsOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, rows: [], message: COPY.missingKeys };
  }
  const loaded = await loadOwnFollowUps(userId);
  if (!loaded.ok) {
    return loaded;
  }

  const rows = loaded.rows;
  const today = todayIsoDate();

  const hadSymptom = rows.some((row) => row.type === "symptom_check");
  const symptomDueDays =
    reason === "hub" && !hadSymptom
      ? FOLLOW_UP_TIMING.visibleDueDays
      : nextSymptomDueDays(hadSymptom);
  if (!hasPendingDuplicate(rows, "symptom_check", FOLLOW_UP_TITLES.symptomCheck)) {
    const created = await insertFollowUp(
      userId,
      "symptom_check",
      FOLLOW_UP_TITLES.symptomCheck,
      COPY.followUpSymptomNote,
      addDaysToIsoDate(today, symptomDueDays),
    );
    if (!created.ok) {
      return { ok: false, rows: [], message: created.message };
    }
  }

  let hasPlan = false;
  try {
    hasPlan = await hasDraftPlan(userId);
  } catch {
    hasPlan = false;
  }

  const hadReview = rows.some((row) => row.type === "review");
  const shouldSeedReview =
    hasPlan &&
    !hasPendingDuplicate(rows, "review", FOLLOW_UP_TITLES.planReview) &&
    (reason === "plan" || !hadReview);
  if (shouldSeedReview) {
    const created = await insertFollowUp(
      userId,
      "review",
      FOLLOW_UP_TITLES.planReview,
      COPY.followUpReviewNote,
      addDaysToIsoDate(today, FOLLOW_UP_TIMING.reviewDueDays),
    );
    if (!created.ok) {
      return { ok: false, rows: [], message: created.message };
    }
  }

  try {
    // Re-check the markers that came back abnormal, not every recommended
    // test. A retest a clinician already put in the list (same title) is left
    // alone so the date they chose at review stands.
    const plans = planRetests(await loadResultsForRetest(userId), {
      defaultDays: FOLLOW_UP_TIMING.retestDueDays,
      today,
      existing: rows.filter((row) => row.type === "retest"),
      max: MAX_RETEST_SEEDS,
    });
    for (const plan of plans) {
      const created = await insertFollowUp(
        userId,
        "retest",
        plan.title,
        COPY.followUpRetestNote,
        plan.dueDate,
      );
      if (!created.ok) {
        return { ok: false, rows: [], message: created.message };
      }
    }
  } catch (error) {
    if (looksLikeMissingTable(error)) {
      return { ok: false, rows: [], message: COPY.followUpNeedSql };
    }
    // Missing test_results is not fatal: symptom and review rows still show.
  }

  return loadOwnFollowUps(userId);
}

export async function completeFollowUp(
  userId: string,
  followUpId: string,
  /** Replaces the row's note when given, e.g. the consent record at a review. */
  plainNote?: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }
  try {
    const direct = await withTimeout(
      supabase
        .from("follow_ups")
        .update(
          plainNote === undefined
            ? { status: "completed" }
            : { status: "completed", plain_note: plainNote },
        )
        .eq("id", followUpId)
        .eq("user_id", userId),
      "Completing follow-up",
    );
    if (!direct.error) {
      return { ok: true };
    }
    if (
      !looksLikeRlsBlock(direct.error) &&
      !looksLikeMissingRpc(direct.error) &&
      !looksLikeMissingTable(direct.error)
    ) {
      throw direct.error;
    }

    const rpc = await withTimeout(
      supabase.rpc("complete_follow_up", {
        p_id: followUpId,
      }),
      "Completing follow-up (secure helper)",
    );
    if (!rpc.error) {
      return { ok: true };
    }
    if (looksLikeFollowUpsBackendMissing(rpc.error) || looksLikeRlsBlock(rpc.error)) {
      return { ok: false, message: COPY.followUpNeedSql };
    }
    throw rpc.error;
  } catch (error) {
    if (looksLikeFollowUpsBackendMissing(error) || looksLikeRlsBlock(error)) {
      return { ok: false, message: COPY.followUpNeedSql };
    }
    return {
      ok: false,
      message: messageFromUnknown(error, COPY.followUpSaveFailed),
    };
  }
}

export async function completeSymptomCheckAndScheduleNext(
  userId: string,
  followUpId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const done = await completeFollowUp(userId, followUpId);
  if (!done.ok) {
    return done;
  }
  const nextDue = addDaysToIsoDate(
    todayIsoDate(),
    FOLLOW_UP_TIMING.symptomRecheckDays,
  );
  return insertFollowUp(
    userId,
    "symptom_check",
    FOLLOW_UP_TITLES.symptomCheck,
    COPY.followUpSymptomNote,
    nextDue,
  );
}

export function upcomingPending(rows: FollowUpRow[]): FollowUpRow[] {
  return rows.filter((row) => row.status === "pending");
}

export function firstPendingSymptom(rows: FollowUpRow[]): FollowUpRow | undefined {
  return upcomingPending(rows).find((row) => row.type === "symptom_check");
}
