/**
 * Curated healthy recipes — read-only library + per-user saves.
 * Recipes are motivational content, not medical advice.
 */
import { COPY } from "@/lib/copy";
import { messageFromUnknown, rawErrorText } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type NutritionInfo = {
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
};

export type RecipeRow = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  prep_min: number;
  cook_min: number;
  servings: number;
  ingredients: string[];
  instructions: string[];
  nutrition: NutritionInfo | null;
  goal_types: string[];
  tags: string[];
  created_at: string;
};

export type SavedRecipeRow = {
  id: string;
  user_id: string;
  recipe_id: string;
  created_at: string;
};

const RECIPE_COLS =
  "id, name, description, image_url, prep_min, cook_min, servings, ingredients, instructions, nutrition, goal_types, tags, created_at";
const SAVED_COLS = "id, user_id, recipe_id, created_at";

const REQUEST_TIMEOUT_MS = 15_000;

function withTimeout<T>(p: PromiseLike<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), REQUEST_TIMEOUT_MS);
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

function looksLikeMissing(error: unknown): boolean {
  const t = rawErrorText(error).toLowerCase();
  return (
    t.includes("recipes") &&
    (t.includes("does not exist") ||
      t.includes("could not find") ||
      t.includes("schema cache") ||
      t.includes("42p01") ||
      t.includes("pgrst205"))
  );
}

export function totalMinutes(row: Pick<RecipeRow, "prep_min" | "cook_min">): number {
  return (row.prep_min ?? 0) + (row.cook_min ?? 0);
}

export async function loadRecipes(input: {
  search?: string | null;
  goalType?: string | null;
  maxMinutes?: number | null;
  limit?: number;
}): Promise<{ ok: true; rows: RecipeRow[] } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    let q = supabase.from("recipes").select(RECIPE_COLS);
    const s = input.search?.trim();
    if (s) {
      q = q.or(`name.ilike.%${s}%,description.ilike.%${s}%`);
    }
    if (input.goalType) {
      q = q.contains("goal_types", [input.goalType]);
    }
    const { data, error } = await withTimeout(
      q.order("created_at", { ascending: false }).limit(input.limit ?? 50),
      "Loading recipes",
    );
    if (error) throw error;
    let rows = (data as RecipeRow[]) ?? [];
    if (typeof input.maxMinutes === "number") {
      rows = rows.filter((r) => totalMinutes(r) <= (input.maxMinutes ?? Infinity));
    }
    return { ok: true, rows };
  } catch (error) {
    if (looksLikeMissing(error)) return { ok: false, message: COPY.recipesNeedSql };
    return { ok: false, message: messageFromUnknown(error, COPY.recipesLoadFailed) };
  }
}

export async function loadRecipeById(
  id: string,
): Promise<{ ok: true; row: RecipeRow | null } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    const { data, error } = await withTimeout(
      supabase.from("recipes").select(RECIPE_COLS).eq("id", id).maybeSingle(),
      "Loading recipe",
    );
    if (error) throw error;
    return { ok: true, row: (data as RecipeRow) ?? null };
  } catch (error) {
    if (looksLikeMissing(error)) return { ok: false, message: COPY.recipesNeedSql };
    return { ok: false, message: messageFromUnknown(error, COPY.recipesLoadFailed) };
  }
}

export async function loadSavedRecipeIds(
  userId: string,
): Promise<{ ok: true; ids: Set<string> } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    const { data, error } = await withTimeout(
      supabase.from("user_saved_recipes").select(SAVED_COLS).eq("user_id", userId),
      "Loading favourites",
    );
    if (error) throw error;
    return { ok: true, ids: new Set((data as SavedRecipeRow[]).map((r) => r.recipe_id)) };
  } catch (error) {
    if (looksLikeMissing(error)) return { ok: false, message: COPY.recipesNeedSql };
    return { ok: false, message: messageFromUnknown(error, COPY.recipesLoadFailed) };
  }
}

export async function saveRecipe(
  userId: string,
  recipeId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    const { error } = await withTimeout(
      supabase
        .from("user_saved_recipes")
        .upsert({ user_id: userId, recipe_id: recipeId }, { onConflict: "user_id,recipe_id" }),
      "Saving recipe",
    );
    if (error) throw error;
    return { ok: true };
  } catch (error) {
    return { ok: false, message: messageFromUnknown(error, COPY.recipesLoadFailed) };
  }
}

export async function unsaveRecipe(
  userId: string,
  recipeId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    const { error } = await withTimeout(
      supabase
        .from("user_saved_recipes")
        .delete()
        .eq("user_id", userId)
        .eq("recipe_id", recipeId),
      "Removing recipe",
    );
    if (error) throw error;
    return { ok: true };
  } catch (error) {
    return { ok: false, message: messageFromUnknown(error, COPY.recipesLoadFailed) };
  }
}

export function adjustIngredientsForPortions(
  ingredients: string[],
  baseServings: number,
  desiredServings: number,
): string[] {
  if (baseServings <= 0 || desiredServings <= 0 || baseServings === desiredServings) {
    return ingredients;
  }
  const ratio = desiredServings / baseServings;
  return ingredients.map((line) =>
    line.replace(/(\d+(?:\.\d+)?)/, (m) => {
      const n = Number(m);
      if (!Number.isFinite(n)) return m;
      const scaled = n * ratio;
      // Keep it tidy — up to two decimals, no trailing zeros.
      return String(Math.round(scaled * 100) / 100);
    }),
  );
}
