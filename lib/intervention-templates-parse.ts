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
