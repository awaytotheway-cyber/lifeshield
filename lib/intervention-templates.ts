/**
 * Intervention template library (Phase B).
 *
 * Additive layer over lib/rules-engine.ts: the engine still writes terse
 * `interventions` rows keyed by `trigger_finding`; at render time the detail
 * screen consults this module to expand a row into rationale + action steps
 * + resources. When no template matches, callers should fall back to the
 * existing (pre-Phase-B) rendering.
 *
 * IO lives here (kept small — one read shape) rather than in a separate
 * -io.ts file because there are no writes from the app; admin edits happen
 * server-side. Results are cached per session to avoid re-fetching the same
 * template as the user navigates around the plan.
 */
import { messageFromUnknown, rawErrorText } from "@/lib/friendly-errors";
import {
  parseActionSteps,
  parseResources,
  toEngineTemplate,
  type ActionStep,
  type ActionStepKind,
  type EngineTemplate,
  type EngineTemplateCategory,
  type Resource,
  type ResourceKind,
} from "@/lib/intervention-templates-parse";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export {
  parseActionSteps,
  parseResources,
  toEngineTemplate,
  type ActionStep,
  type ActionStepKind,
  type EngineTemplate,
  type EngineTemplateCategory,
  type Resource,
  type ResourceKind,
};

export type InterventionTemplate = {
  id: string;
  code: string;
  title: string;
  rationale_md: string | null;
  action_steps: ActionStep[];
  resources: Resource[];
  impact_score: number;
  contraindication_codes: string[];
  trigger_findings: string[];
  created_at: string;
  updated_at: string;
};

const COLUMNS =
  "id, code, title, rationale_md, action_steps, resources, impact_score, contraindication_codes, trigger_findings, created_at, updated_at";

// Trigger findings are stored case-sensitively as clinical terms. The lookup
// cache is keyed on the raw string so callers don't need to normalise.
const cache = new Map<string, InterventionTemplate | null>();

export type LoadTemplateOutcome =
  | { ok: true; template: InterventionTemplate | null }
  | { ok: false; message: string; missingTable?: boolean };

/**
 * Fetch the template that covers a given rules-engine trigger finding.
 * Returns null (with ok: true) when no template exists — the caller should
 * render the pre-Phase-B fallback.
 */
export async function loadTemplateForTriggerFinding(
  triggerFinding: string,
): Promise<LoadTemplateOutcome> {
  const key = triggerFinding.trim();
  if (!key) return { ok: true, template: null };

  if (cache.has(key)) {
    return { ok: true, template: cache.get(key) ?? null };
  }

  if (!isSupabaseConfigured) {
    cache.set(key, null);
    return { ok: true, template: null };
  }

  try {
    const { data, error } = await supabase
      .from("intervention_templates")
      .select(COLUMNS)
      .contains("trigger_findings", [key])
      .order("impact_score", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      const text = rawErrorText(error).toLowerCase();
      const missingTable =
        text.includes("intervention_templates") &&
        (text.includes("does not exist") ||
          text.includes("relation") ||
          text.includes("not found"));
      if (missingTable) {
        cache.set(key, null);
        return {
          ok: false,
          missingTable: true,
          message:
            "Intervention templates table isn't set up. Run supabase/migrations/20260925_intervention_templates_and_progress.sql.",
        };
      }
      return {
        ok: false,
        message: messageFromUnknown(error, "Couldn't load template."),
      };
    }

    const template = (data as InterventionTemplate | null) ?? null;
    cache.set(key, template);
    return { ok: true, template };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, "Couldn't load template."),
    };
  }
}

/**
 * Test-only: clear the per-session cache. Do not call from app code — the
 * cache is intentionally sticky within a session so the plan screen doesn't
 * hammer the DB while the user browses.
 */
export function __clearTemplateCacheForTests(): void {
  cache.clear();
}

// ---------- Engine loader ----------

const ENGINE_COLUMNS =
  "code, title, rationale_md, trigger_findings, plain_reason, description, category, needs_interaction_check, contraindication_codes";

/**
 * Fetch all templates the rules engine needs. Returns null on any error so
 * plan.ts falls back to lib/rules-engine.ts's hard-coded FINDING_INTERVENTION_TABLE.
 *
 * Rows that fail toEngineTemplate (missing plain_reason / description /
 * category — typically an in-progress admin edit against the extended
 * schema) are dropped from the returned array. The engine then simply
 * won't emit that intervention; the next slice could layer per-id
 * fallback onto the hard-coded array, but that's not needed until admin
 * routinely edits templates.
 */
export async function loadTemplatesForEngine(): Promise<EngineTemplate[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from("intervention_templates")
      .select(ENGINE_COLUMNS)
      .order("impact_score", { ascending: false });

    if (error) {
      return null;
    }
    const rows = Array.isArray(data) ? data : [];
    const engineTemplates: EngineTemplate[] = [];
    for (const row of rows) {
      const template = toEngineTemplate(row);
      if (template) engineTemplates.push(template);
    }
    return engineTemplates.length > 0 ? engineTemplates : null;
  } catch {
    return null;
  }
}
