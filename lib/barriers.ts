/**
 * Barriers & strategies — a small library of common obstacles and an
 * evidence-informed strategy for each. Users pick one to "try" on a
 * specific goal or plan intervention; a week later we ask if it helped.
 *
 * Not medical advice — motivational scaffolding for the plan.
 */
import { COPY } from "@/lib/copy";
import { messageFromUnknown, rawErrorText } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type BarrierType = "time" | "energy" | "motivation" | "knowledge";

export type BarrierCategory =
  | "supplement"
  | "exercise"
  | "meditation"
  | "recipe"
  | "habit"
  | "diet"
  | "lifestyle"
  | "therapy"
  | "referral"
  | "coaching";

export type BarrierRow = {
  id: string;
  barrier_type: BarrierType;
  category: BarrierCategory | null;
  title: string;
  strategy: string;
  tip: string | null;
  evidence_note: string | null;
  created_at: string;
};

export type UserBarrierStatus =
  | "trying"
  | "helpful"
  | "not_helpful"
  | "abandoned";

export type UserBarrierSourceType = "goal" | "intervention" | "general";

export type UserBarrierRow = {
  id: string;
  user_id: string;
  barrier_id: string;
  source_type: UserBarrierSourceType;
  source_id: string | null;
  status: UserBarrierStatus;
  continue_likelihood: number | null;
  feedback_note: string | null;
  tried_at: string;
  feedback_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BarrierWithStrategy = BarrierRow & {
  user_state: UserBarrierRow | null;
};

const BARRIER_COLS =
  "id, barrier_type, category, title, strategy, tip, evidence_note, created_at";
const USER_BARRIER_COLS =
  "id, user_id, barrier_id, source_type, source_id, status, continue_likelihood, feedback_note, tried_at, feedback_at, created_at, updated_at";

const REQUEST_TIMEOUT_MS = 15_000;

function withTimeout<T>(p: PromiseLike<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out`)),
      REQUEST_TIMEOUT_MS,
    );
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

export function looksLikeBarriersBackendMissing(error: unknown): boolean {
  const text = rawErrorText(error).toLowerCase();
  return (
    (text.includes("barriers") &&
      (text.includes("does not exist") ||
        text.includes("could not find") ||
        text.includes("schema cache") ||
        text.includes("42p01"))) ||
    (text.includes("pgrst205") && text.includes("barriers"))
  );
}

export const BARRIER_TYPE_ORDER: BarrierType[] = [
  "time",
  "energy",
  "motivation",
  "knowledge",
];

export function barrierTypeLabel(type: BarrierType): string {
  switch (type) {
    case "time":
      return COPY.barrierTypeTime;
    case "energy":
      return COPY.barrierTypeEnergy;
    case "motivation":
      return COPY.barrierTypeMotivation;
    case "knowledge":
      return COPY.barrierTypeKnowledge;
  }
}

/**
 * Load library barriers for a category. Also returns barriers with
 * category NULL (they apply broadly). Ordered by type then title so the
 * accordion feels stable.
 */
export async function loadBarriersForCategory(
  category: BarrierCategory | null,
): Promise<{ ok: true; rows: BarrierRow[] } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }
  try {
    let query = supabase.from("barriers").select(BARRIER_COLS);
    if (category) {
      query = query.or(`category.eq.${category},category.is.null`);
    }
    const { data, error } = await withTimeout(
      query.order("barrier_type").order("title"),
      "Loading barriers",
    );
    if (error) throw error;
    return { ok: true, rows: (data as BarrierRow[]) ?? [] };
  } catch (error) {
    if (looksLikeBarriersBackendMissing(error)) {
      return { ok: false, message: COPY.barriersNeedSql };
    }
    return { ok: false, message: messageFromUnknown(error, COPY.barriersLoadFailed) };
  }
}

export async function loadUserBarriersFor(
  userId: string,
  sourceType: UserBarrierSourceType,
  sourceId: string | null,
): Promise<
  { ok: true; rows: UserBarrierRow[] } | { ok: false; message: string }
> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }
  try {
    let query = supabase
      .from("user_barriers")
      .select(USER_BARRIER_COLS)
      .eq("user_id", userId)
      .eq("source_type", sourceType);
    query = sourceId ? query.eq("source_id", sourceId) : query.is("source_id", null);
    const { data, error } = await withTimeout(
      query.order("tried_at", { ascending: false }),
      "Loading tried barriers",
    );
    if (error) throw error;
    return { ok: true, rows: (data as UserBarrierRow[]) ?? [] };
  } catch (error) {
    if (looksLikeBarriersBackendMissing(error)) {
      return { ok: false, message: COPY.barriersNeedSql };
    }
    return { ok: false, message: messageFromUnknown(error, COPY.barriersLoadFailed) };
  }
}

export type TryBarrierInput = {
  userId: string;
  barrierId: string;
  sourceType: UserBarrierSourceType;
  sourceId: string | null;
};

export async function tryBarrier(
  input: TryBarrierInput,
): Promise<{ ok: true; row: UserBarrierRow } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("user_barriers")
        .insert({
          user_id: input.userId,
          barrier_id: input.barrierId,
          source_type: input.sourceType,
          source_id: input.sourceId,
        })
        .select(USER_BARRIER_COLS)
        .single(),
      "Saving barrier",
    );
    if (error) throw error;
    return { ok: true, row: data as UserBarrierRow };
  } catch (error) {
    if (looksLikeBarriersBackendMissing(error)) {
      return { ok: false, message: COPY.barriersNeedSql };
    }
    return { ok: false, message: messageFromUnknown(error, COPY.barriersLoadFailed) };
  }
}

export async function submitBarrierFeedback(
  id: string,
  patch: {
    status: UserBarrierStatus;
    continue_likelihood?: number | null;
    feedback_note?: string | null;
  },
): Promise<{ ok: true; row: UserBarrierRow } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("user_barriers")
        .update({
          status: patch.status,
          continue_likelihood: patch.continue_likelihood ?? null,
          feedback_note: patch.feedback_note?.trim() || null,
          feedback_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(USER_BARRIER_COLS)
        .single(),
      "Saving feedback",
    );
    if (error) throw error;
    return { ok: true, row: data as UserBarrierRow };
  } catch (error) {
    if (looksLikeBarriersBackendMissing(error)) {
      return { ok: false, message: COPY.barriersNeedSql };
    }
    return { ok: false, message: messageFromUnknown(error, COPY.barriersLoadFailed) };
  }
}

export async function deleteUserBarrier(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    const { error } = await withTimeout(
      supabase.from("user_barriers").delete().eq("id", id),
      "Removing barrier",
    );
    if (error) throw error;
    return { ok: true };
  } catch (error) {
    if (looksLikeBarriersBackendMissing(error)) {
      return { ok: false, message: COPY.barriersNeedSql };
    }
    return { ok: false, message: messageFromUnknown(error, COPY.barriersLoadFailed) };
  }
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** True when we should ask the user how a "trying" barrier is going. */
export function isFeedbackDue(row: UserBarrierRow, now = Date.now()): boolean {
  if (row.status !== "trying") return false;
  const started = new Date(row.tried_at).getTime();
  if (!Number.isFinite(started)) return false;
  return now - started >= WEEK_MS;
}

/**
 * Merge library rows with user state. Preserves library order.
 */
export function mergeBarriers(
  library: BarrierRow[],
  tried: UserBarrierRow[],
): BarrierWithStrategy[] {
  const byBarrier = new Map<string, UserBarrierRow>();
  for (const row of tried) {
    const existing = byBarrier.get(row.barrier_id);
    if (!existing || existing.tried_at < row.tried_at) {
      byBarrier.set(row.barrier_id, row);
    }
  }
  return library.map((b) => ({ ...b, user_state: byBarrier.get(b.id) ?? null }));
}
