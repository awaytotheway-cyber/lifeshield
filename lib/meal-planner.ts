/**
 * Pure meal-plan generator (Phase C).
 *
 * Deterministic: same inputs → same output. IO lives in lib/meal-plans-io.ts.
 *
 * Algorithm (kept simple on purpose; goal-driven and shopping-habit-driven
 * planning are follow-up slices):
 *   1. Filter recipes to active ones whose tags don't intersect avoid_tags.
 *   2. Bucket by slot heuristic: a recipe tagged "breakfast" goes in the
 *      breakfast bucket, etc. Recipes without a matching slot tag fall into
 *      the "any" bucket, used as fallback when a slot bucket is empty.
 *   3. For each day in [start, end], for each requested slot, pick the
 *      recipe at (dayIndex + slotOffset) mod bucketSize. slotOffset is
 *      deterministic per-slot so breakfast/lunch/dinner cycle out of phase,
 *      which reads as "not the same three recipes every day".
 *   4. When a bucket is empty (no matching AND no fallback), the slot is
 *      omitted from that day rather than filled with a placeholder.
 *
 * Recipe metadata (slug + name) is denormalised into each meal entry so the
 * saved plan renders offline and survives a recipe rename.
 */

import type { RecipeSummary } from "@/lib/recipes";

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export const ALL_SLOTS: readonly MealSlot[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

export type MealPlanPreferences = {
  slots: readonly MealSlot[];
  avoid_tags: readonly string[];
};

export type MealEntry = {
  slot: MealSlot;
  recipe_id: string;
  recipe_slug: string;
  recipe_name: string;
};

export type MealDay = {
  date: string; // YYYY-MM-DD (local)
  meals: MealEntry[];
};

export type MealPlanPayload = {
  days: MealDay[];
};

export type GeneratePlanInput = {
  recipes: readonly RecipeSummary[];
  preferences: MealPlanPreferences;
  /** Inclusive local-date range in YYYY-MM-DD. */
  start_date: string;
  end_date: string;
};

const SLOT_OFFSETS: Record<MealSlot, number> = {
  breakfast: 0,
  lunch: 3,
  dinner: 5,
  snack: 2,
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type GeneratePlanError = {
  code:
    | "no_slots"
    | "empty_library"
    | "no_recipes_after_filter"
    | "bad_date_range";
  message: string;
};

export type GeneratePlanOutcome =
  | { ok: true; plan: MealPlanPayload }
  | { ok: false; error: GeneratePlanError };

export function generateMealPlan(
  input: GeneratePlanInput,
): GeneratePlanOutcome {
  const { recipes, preferences, start_date, end_date } = input;

  if (!ISO_DATE.test(start_date) || !ISO_DATE.test(end_date)) {
    return {
      ok: false,
      error: { code: "bad_date_range", message: "Start and end must be YYYY-MM-DD dates." },
    };
  }
  if (end_date < start_date) {
    return {
      ok: false,
      error: { code: "bad_date_range", message: "End date must be on or after start date." },
    };
  }
  if (preferences.slots.length === 0) {
    return {
      ok: false,
      error: { code: "no_slots", message: "Pick at least one meal slot." },
    };
  }
  if (recipes.length === 0) {
    return {
      ok: false,
      error: {
        code: "empty_library",
        message: "The recipe library is empty. Ask an admin to add recipes.",
      },
    };
  }

  const avoid = new Set(
    preferences.avoid_tags
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0),
  );
  const filtered = recipes.filter((recipe) => {
    if (!recipe.active) return false;
    const tags = recipe.tags.map((t) => t.toLowerCase());
    return !tags.some((tag) => avoid.has(tag));
  });

  if (filtered.length === 0) {
    return {
      ok: false,
      error: {
        code: "no_recipes_after_filter",
        message: "No recipes match your filters. Loosen the avoid-tags list.",
      },
    };
  }

  const buckets: Record<MealSlot, RecipeSummary[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
  for (const recipe of filtered) {
    const tags = recipe.tags.map((t) => t.toLowerCase());
    for (const slot of ALL_SLOTS) {
      if (tags.includes(slot)) buckets[slot].push(recipe);
    }
  }

  const days: MealDay[] = [];
  const dateCursor = new Date(`${start_date}T00:00:00`);
  const stopAt = new Date(`${end_date}T00:00:00`);
  let dayIndex = 0;

  while (dateCursor.getTime() <= stopAt.getTime()) {
    const meals: MealEntry[] = [];
    for (const slot of preferences.slots) {
      const bucket = buckets[slot];
      // Fall back to the whole filtered pool if the slot has nothing tagged.
      const pool = bucket.length > 0 ? bucket : filtered;
      if (pool.length === 0) continue;
      const offset = SLOT_OFFSETS[slot];
      const pick = pool[(dayIndex + offset) % pool.length];
      meals.push({
        slot,
        recipe_id: pick.id,
        recipe_slug: pick.slug,
        recipe_name: pick.name,
      });
    }
    days.push({ date: ymd(dateCursor), meals });
    dateCursor.setDate(dateCursor.getDate() + 1);
    dayIndex += 1;
  }

  return { ok: true, plan: { days } };
}

/**
 * Cheap summary shown on the meal-plans list — how many days the plan covers
 * and how many distinct recipes it uses. Pure so the list can render without
 * loading each plan's recipes.
 */
export function summarizePlan(payload: MealPlanPayload): {
  day_count: number;
  meal_count: number;
  unique_recipe_count: number;
} {
  const days = payload.days;
  const uniq = new Set<string>();
  let mealCount = 0;
  for (const day of days) {
    for (const meal of day.meals) {
      uniq.add(meal.recipe_id);
      mealCount += 1;
    }
  }
  return {
    day_count: days.length,
    meal_count: mealCount,
    unique_recipe_count: uniq.size,
  };
}

function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
