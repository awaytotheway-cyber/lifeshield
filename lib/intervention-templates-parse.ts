/**
 * Pure jsonb-shape guards for intervention templates. Kept in its own file
 * (no Supabase or RN imports) so lib/intervention-templates.test.ts can
 * import them without dragging the app frame into tsx.
 */

export type ActionStepKind =
  | "supplement"
  | "diet"
  | "lifestyle"
  | "therapy"
  | "referral"
  | "coaching"
  | "generic";

export type ActionStep = {
  text: string;
  why?: string;
  dose?: string;
  when?: string;
  kind?: ActionStepKind;
};

export type ResourceKind = "article" | "study" | "video" | "product";

export type Resource = {
  title: string;
  url: string;
  kind: ResourceKind;
};

/**
 * Normalise a jsonb column that might come back as a JSON string on some
 * Supabase clients. Callers pass this the raw column value.
 */
export function parseActionSteps(raw: unknown): ActionStep[] {
  const parsed = parseJsonMaybe(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (item): item is ActionStep =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as { text?: unknown }).text === "string",
  );
}

export function parseResources(raw: unknown): Resource[] {
  const parsed = parseJsonMaybe(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (item): item is Resource =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as { title?: unknown }).title === "string" &&
      typeof (item as { url?: unknown }).url === "string",
  );
}

function parseJsonMaybe(raw: unknown): unknown {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

// ---------- Engine-facing shape ----------

export type EngineTemplateCategory =
  | "supplement"
  | "diet"
  | "lifestyle"
  | "therapy"
  | "referral"
  | "coaching";

/**
 * Shape the rules engine needs to write a draft intervention row. Kept
 * distinct from InterventionTemplate (the full DB row) so the engine
 * doesn't drag in fields it never reads (action_steps, resources, …).
 *
 * The engine keys on `id`, uses the trigger_findings array to write the
 * `trigger_finding` on the intervention row, and pulls title / plain_reason
 * / description / category / clinical_basis / needsInteractionCheck through
 * to that row unchanged.
 */
export type EngineTemplate = {
  id: string;
  trigger_finding: string;
  title: string;
  plain_reason: string;
  description: string;
  category: EngineTemplateCategory;
  clinical_basis: string;
  needsInteractionCheck: boolean;
};

const ENGINE_CATEGORIES: readonly EngineTemplateCategory[] = [
  "supplement",
  "diet",
  "lifestyle",
  "therapy",
  "referral",
  "coaching",
];

/**
 * Convert a raw intervention_templates row to the shape the engine expects.
 * Returns null when a required field is missing or malformed — an in-progress
 * admin edit that only fills half the row must not leak into the plan; the
 * caller drops the template and (typically) falls back to the hard-coded
 * FINDING_INTERVENTION_TABLE for that id.
 *
 * `rationale_md` maps to the engine's `clinical_basis` (they were the same
 * string when we seeded from lib/rules-engine.ts).
 * `trigger_finding` is the first entry of `trigger_findings` — templates
 * currently carry one exact string per rules-engine finding.
 */
export function toEngineTemplate(row: unknown): EngineTemplate | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;

  const code = readString(r.code);
  if (!code) return null;

  const triggerFindings = Array.isArray(r.trigger_findings)
    ? (r.trigger_findings.filter(
        (item): item is string => typeof item === "string" && item.length > 0,
      ) as string[])
    : [];
  const triggerFinding = triggerFindings[0];
  if (!triggerFinding) return null;

  const title = readString(r.title);
  if (!title) return null;

  const plainReason = readString(r.plain_reason);
  if (!plainReason) return null;

  const description = readString(r.description);
  if (!description) return null;

  const category = readString(r.category);
  if (!ENGINE_CATEGORIES.includes(category as EngineTemplateCategory)) {
    return null;
  }

  const clinicalBasis = readString(r.rationale_md);
  if (!clinicalBasis) return null;

  const needsInteractionCheck = readBool(r.needs_interaction_check);

  return {
    id: code,
    trigger_finding: triggerFinding,
    title,
    plain_reason: plainReason,
    description,
    category: category as EngineTemplateCategory,
    clinical_basis: clinicalBasis,
    needsInteractionCheck,
  };
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readBool(value: unknown): boolean {
  return value === true;
}
