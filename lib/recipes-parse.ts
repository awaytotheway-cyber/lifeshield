/**
 * Pure jsonb-shape guards for recipes. Kept in its own file (no Supabase /
 * RN imports) so lib/recipes.test.ts can import them without dragging the
 * app frame into tsx.
 */

export type Ingredient = {
  name: string;
  /** Free-form quantity — "1", "2 1/2", "a pinch" etc. */
  amount?: string;
  /** cup / g / tbsp / clove / … */
  unit?: string;
  note?: string;
};

export type InstructionStep = {
  /** 1-indexed step number. Assigned when parsing a plain string list. */
  step: number;
  text: string;
};

export type Nutrition = {
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
};

export function parseIngredients(raw: unknown): Ingredient[] {
  const parsed = parseJsonMaybe(raw);
  if (!Array.isArray(parsed)) return [];
  const out: Ingredient[] = [];
  for (const item of parsed) {
    if (typeof item === "string" && item.trim().length > 0) {
      // Legacy / minimal shape: a plain string. Treat the whole thing as
      // the ingredient name so it still renders.
      out.push({ name: item.trim() });
      continue;
    }
    if (
      item &&
      typeof item === "object" &&
      typeof (item as { name?: unknown }).name === "string" &&
      (item as { name: string }).name.trim().length > 0
    ) {
      const source = item as {
        name: string;
        amount?: unknown;
        unit?: unknown;
        note?: unknown;
      };
      out.push({
        name: source.name.trim(),
        amount:
          typeof source.amount === "string"
            ? source.amount
            : typeof source.amount === "number"
              ? String(source.amount)
              : undefined,
        unit: typeof source.unit === "string" ? source.unit : undefined,
        note: typeof source.note === "string" ? source.note : undefined,
      });
    }
  }
  return out;
}

/**
 * Accepts two shapes:
 *   - ["Preheat the oven…", "Chop the …"]           → auto-numbered
 *   - [{step: 1, text: "…"}, {step: 2, text: "…"}]  → number preserved
 * Empty / malformed entries are dropped so a partial admin edit can't
 * strand the detail screen with a blank ordered list.
 */
export function parseInstructions(raw: unknown): InstructionStep[] {
  const parsed = parseJsonMaybe(raw);
  if (!Array.isArray(parsed)) return [];
  const out: InstructionStep[] = [];
  let auto = 1;
  for (const item of parsed) {
    if (typeof item === "string" && item.trim().length > 0) {
      out.push({ step: auto, text: item.trim() });
      auto += 1;
      continue;
    }
    if (
      item &&
      typeof item === "object" &&
      typeof (item as { text?: unknown }).text === "string" &&
      (item as { text: string }).text.trim().length > 0
    ) {
      const source = item as { step?: unknown; text: string };
      const step =
        typeof source.step === "number" && Number.isFinite(source.step)
          ? Math.max(1, Math.floor(source.step))
          : auto;
      out.push({ step, text: source.text.trim() });
      auto = Math.max(auto, step) + 1;
    }
  }
  return out;
}

/**
 * Accepts a plain object with any subset of the Nutrition fields. Values
 * that aren't finite numbers are dropped rather than defaulted to 0 — an
 * unknown macro should read as "unknown" in the UI, not as "0 g".
 */
export function parseNutrition(raw: unknown): Nutrition {
  const parsed = parseJsonMaybe(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }
  const source = parsed as Record<string, unknown>;
  const out: Nutrition = {};
  for (const key of [
    "calories",
    "protein_g",
    "carbs_g",
    "fat_g",
    "fiber_g",
  ] as const) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = value;
    }
  }
  return out;
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
