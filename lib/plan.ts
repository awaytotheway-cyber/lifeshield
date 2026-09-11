/**
 * Load and replace draft plan rows in public.interventions.
 * Generation uses mapResultsToInterventions() so iodine hard-stop
 * and interaction checks run before anything is shown.
 *
 * Never presents a row as an instruction — status stays draft.
 */
import { COPY } from "@/lib/copy";
import { seedFollowUpsIfNeeded } from "@/lib/follow-ups";
import { loadClinicalThresholds } from "@/lib/load-thresholds";
import { messageFromUnknown, rawErrorText } from "@/lib/friendly-errors";
import { labsFromTestResults } from "@/lib/labs-from-results";
import { factsFromSavedAnswers } from "@/lib/rules-facts";
import {
  mapResultsToInterventions,
  type DraftIntervention,
  type InterventionCategory,
} from "@/lib/rules-engine";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { loadOwnTestResults } from "@/lib/test-results";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";

export type InterventionStatus =
  | "draft"
  | "clinician_approved"
  | "active"
  | "paused"
  | "completed"
  | "declined"
  | string;

export type InterventionRow = {
  id: string;
  user_id: string;
  trigger_finding: string;
  plain_reason: string | null;
  category: InterventionCategory | string;
  title: string;
  description: string | null;
  clinical_basis: string | null;
  status: InterventionStatus;
  clinician_interaction_check: boolean;
  created_at: string;
};

export type LoadInterventionsOutcome =
  | { ok: true; rows: InterventionRow[] }
  | { ok: false; rows: []; message: string };

export type ReplacePlanOutcome =
  | { ok: true; rows: InterventionRow[] }
  | { ok: false; rows: []; message: string };

const INTERVENTION_COLUMNS =
  "id, user_id, trigger_finding, plain_reason, category, title, description, clinical_basis, status, clinician_interaction_check, created_at";

const INTERVENTION_COLUMNS_NO_FLAG =
  "id, user_id, trigger_finding, plain_reason, category, title, description, clinical_basis, status, created_at";

function looksLikeMissingColumn(error: unknown): boolean {
  const text = rawErrorText(error).toLowerCase();
  return (
    text.includes("clinician_interaction_check") &&
    (text.includes("does not exist") ||
      text.includes("schema cache") ||
      text.includes("pgrst204") ||
      text.includes("column"))
  );
}

function looksLikeMissingReplaceRpc(error: unknown): boolean {
  const text = rawErrorText(error).toLowerCase();
  return (
    text.includes("pgrst202") ||
    (text.includes("replace_draft_interventions") &&
      (text.includes("does not exist") ||
        text.includes("not find") ||
        text.includes("schema cache"))) ||
    (text.includes("could not find the function") &&
      text.includes("replace_draft"))
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

function asRows(
  data: unknown,
  fallbackFlag = false,
): InterventionRow[] {
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map((item) => {
    const row = item as InterventionRow;
    return {
      ...row,
      clinician_interaction_check: Boolean(
        row.clinician_interaction_check ?? fallbackFlag,
      ),
    };
  });
}

export async function loadOwnInterventions(
  userId: string,
): Promise<LoadInterventionsOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, rows: [], message: COPY.missingKeys };
  }
  try {
    const withFlag = await supabase
      .from("interventions")
      .select(INTERVENTION_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (withFlag.error) {
      if (!looksLikeMissingColumn(withFlag.error)) {
        throw withFlag.error;
      }
      const withoutFlag = await supabase
        .from("interventions")
        .select(INTERVENTION_COLUMNS_NO_FLAG)
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (withoutFlag.error) {
        throw withoutFlag.error;
      }
      return { ok: true, rows: asRows(withoutFlag.data, false) };
    }
    return { ok: true, rows: asRows(withFlag.data) };
  } catch (error) {
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(error, COPY.planLoadFailed),
    };
  }
}

export async function loadOwnInterventionById(
  userId: string,
  interventionId: string,
): Promise<LoadInterventionsOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, rows: [], message: COPY.missingKeys };
  }
  try {
    const withFlag = await supabase
      .from("interventions")
      .select(INTERVENTION_COLUMNS)
      .eq("user_id", userId)
      .eq("id", interventionId)
      .maybeSingle();
    if (withFlag.error) {
      if (!looksLikeMissingColumn(withFlag.error)) {
        throw withFlag.error;
      }
      const withoutFlag = await supabase
        .from("interventions")
        .select(INTERVENTION_COLUMNS_NO_FLAG)
        .eq("user_id", userId)
        .eq("id", interventionId)
        .maybeSingle();
      if (withoutFlag.error) {
        throw withoutFlag.error;
      }
      return {
        ok: true,
        rows: withoutFlag.data ? asRows([withoutFlag.data], false) : [],
      };
    }
    return {
      ok: true,
      rows: withFlag.data ? asRows([withFlag.data]) : [],
    };
  } catch (error) {
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(error, COPY.planDetailLoadFailed),
    };
  }
}

export async function hasOwnInterventions(userId: string): Promise<{
  ok: boolean;
  hasRows: boolean;
  message?: string;
}> {
  if (!isSupabaseConfigured) {
    return { ok: false, hasRows: false, message: COPY.missingKeys };
  }
  try {
    const { count, error } = await supabase
      .from("interventions")
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
      message: messageFromUnknown(error, COPY.planLoadFailed),
    };
  }
}

async function insertDraftsDirect(
  userId: string,
  drafts: DraftIntervention[],
): Promise<void> {
  if (drafts.length === 0) {
    return;
  }
  const payload = drafts.map((row) => ({
    user_id: userId,
    trigger_finding: row.trigger_finding,
    plain_reason: row.plain_reason,
    category: row.category,
    title: row.title,
    description: row.description,
    clinical_basis: row.clinical_basis,
    status: "draft" as const,
    clinician_interaction_check: row.clinician_interaction_check,
  }));
  const withFlag = await supabase.from("interventions").insert(payload);
  if (!withFlag.error) {
    return;
  }
  if (!looksLikeMissingColumn(withFlag.error)) {
    throw withFlag.error;
  }
  const withoutFlag = await supabase.from("interventions").insert(
    payload.map(({ clinician_interaction_check: _flag, ...rest }) => rest),
  );
  if (withoutFlag.error) {
    throw withoutFlag.error;
  }
}

async function replaceDraftsInDatabase(
  userId: string,
  drafts: DraftIntervention[],
): Promise<void> {
  const rpc = await supabase.rpc("replace_draft_interventions", {
    p_user_id: userId,
    p_rows: drafts,
  });
  if (!rpc.error) {
    return;
  }
  if (!looksLikeMissingReplaceRpc(rpc.error) && !looksLikeRlsBlock(rpc.error)) {
    throw rpc.error;
  }

  // RPC missing or blocked — fall back to table writes (own_interventions RLS).
  const deleted = await supabase
    .from("interventions")
    .delete()
    .eq("user_id", userId)
    .eq("status", "draft");
  if (deleted.error) {
    if (looksLikeRlsBlock(deleted.error) || looksLikeMissingReplaceRpc(rpc.error)) {
      throw new Error(COPY.planNeedSql);
    }
    throw deleted.error;
  }
  try {
    await insertDraftsDirect(userId, drafts);
  } catch (error) {
    if (looksLikeRlsBlock(error)) {
      throw new Error(COPY.planNeedSql);
    }
    throw error;
  }
}

/**
 * Load questionnaire + labs, run the mapper (safety checks included),
 * delete this user's draft rows, insert the new drafts.
 * clinician_approved (and other non-draft) rows are kept.
 */
export async function regenerateDraftPlan(
  userId: string,
): Promise<ReplacePlanOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, rows: [], message: COPY.missingKeys };
  }
  try {
    const [engine, results] = await Promise.all([
      useQuestionnaireStore.getState().loadForEngine(userId),
      loadOwnTestResults(userId),
    ]);
    if (!engine.ok) {
      return {
        ok: false,
        rows: [],
        message: engine.message ?? COPY.planGenerateFailed,
      };
    }
    if (!results.ok) {
      return { ok: false, rows: [], message: results.message };
    }

    const facts = factsFromSavedAnswers({
      bmi: engine.bmi,
      sections: engine.sections,
    });
    const labs = labsFromTestResults(results.rows);
    const thresholds = await loadClinicalThresholds();
    const drafts = mapResultsToInterventions(facts, labs, thresholds);

    await replaceDraftsInDatabase(userId, drafts);
    try {
      await seedFollowUpsIfNeeded(userId, "plan");
    } catch {
      // Follow-up seeding must not block a successful plan refresh.
    }
    const loaded = await loadOwnInterventions(userId);
    if (!loaded.ok) {
      return loaded;
    }
    const flagByFinding = new Map(
      drafts.map((draft) => [
        draft.trigger_finding,
        draft.clinician_interaction_check,
      ]),
    );
    return {
      ok: true,
      rows: loaded.rows.map((row) => ({
        ...row,
        clinician_interaction_check:
          row.clinician_interaction_check ||
          Boolean(flagByFinding.get(row.trigger_finding)),
      })),
    };
  } catch (error) {
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(error, COPY.planGenerateFailed),
    };
  }
}

export { reviewStatusLabel } from "@/lib/plan-groups";
