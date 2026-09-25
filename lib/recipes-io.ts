/**
 * Supabase reads for the recipe library + favorite toggle. Kept out of
 * lib/recipes.ts so the pure filter/sort logic stays testable without a
 * Supabase connection.
 */
import { messageFromUnknown, rawErrorText } from "@/lib/friendly-errors";
import {
  parseIngredients,
  parseInstructions,
  parseNutrition,
  type Recipe,
  type RecipeSummary,
} from "@/lib/recipes";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const REQUEST_TIMEOUT_MS = 15_000;

function withTimeout<T>(
  promise: PromiseLike<T>,
  label: string,
  timeoutMs = REQUEST_TIMEOUT_MS,
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
    text.includes("recipes") &&
    (text.includes("does not exist") ||
      text.includes("relation") ||
      text.includes("not found"))
  );
}

const SUMMARY_COLUMNS =
  "id, slug, name, description, tags, prep_minutes, cook_minutes, servings, image_url, active";
const FULL_COLUMNS =
  "id, slug, name, description, ingredients, instructions, nutrition, tags, prep_minutes, cook_minutes, servings, image_url, active, created_at, updated_at";

export type LoadSummariesOutcome =
  | { ok: true; rows: RecipeSummary[] }
  | { ok: false; rows: []; message: string; missingTable?: boolean };

export async function loadRecipeSummaries(): Promise<LoadSummariesOutcome> {
  if (!isSupabaseConfigured) return { ok: true, rows: [] };
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("recipes")
        .select(SUMMARY_COLUMNS)
        .eq("active", true)
        .order("name", { ascending: true }),
      "Loading recipes",
    );
    if (error) {
      if (looksLikeMissingTable(error)) {
        return {
          ok: false,
          rows: [],
          message:
            "Recipes table isn't set up yet. Run supabase/migrations/20260926_recipes.sql.",
          missingTable: true,
        };
      }
      return {
        ok: false,
        rows: [],
        message: messageFromUnknown(error, "Couldn't load recipes."),
      };
    }
    return { ok: true, rows: (data ?? []) as RecipeSummary[] };
  } catch (error) {
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(error, "Couldn't load recipes."),
    };
  }
}

export type LoadRecipeOutcome =
  | { ok: true; recipe: Recipe | null }
  | { ok: false; message: string };

/**
 * Fetch a single recipe by slug. Returns { ok:true, recipe:null } when no
 * row matches, distinct from an error so the detail screen can show a
 * "not found" state without a scary error banner.
 */
export async function loadRecipeBySlug(
  slug: string,
): Promise<LoadRecipeOutcome> {
  if (!isSupabaseConfigured) return { ok: true, recipe: null };
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("recipes")
        .select(FULL_COLUMNS)
        .eq("slug", slug)
        .maybeSingle(),
      "Loading recipe",
    );
    if (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, "Couldn't load recipe."),
      };
    }
    if (!data) return { ok: true, recipe: null };
    const raw = data as Record<string, unknown>;
    const recipe: Recipe = {
      id: raw.id as string,
      slug: raw.slug as string,
      name: raw.name as string,
      description: (raw.description as string | null) ?? null,
      ingredients: parseIngredients(raw.ingredients),
      instructions: parseInstructions(raw.instructions),
      nutrition: parseNutrition(raw.nutrition),
      tags: Array.isArray(raw.tags)
        ? (raw.tags.filter((t): t is string => typeof t === "string"))
        : [],
      prep_minutes: (raw.prep_minutes as number | null) ?? null,
      cook_minutes: (raw.cook_minutes as number | null) ?? null,
      servings: (raw.servings as number | null) ?? null,
      image_url: (raw.image_url as string | null) ?? null,
      active: Boolean(raw.active),
      created_at: raw.created_at as string,
      updated_at: raw.updated_at as string,
    };
    return { ok: true, recipe };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, "Couldn't load recipe."),
    };
  }
}

// ---------- Favorites ----------

export type LoadFavoritesOutcome =
  | { ok: true; ids: Set<string> }
  | { ok: false; ids: Set<string>; message: string };

/**
 * Returns the set of recipe ids the user has favorited. The set shape suits
 * the list/detail toggle check without another allocation.
 */
export async function loadFavoriteRecipeIds(
  userId: string,
): Promise<LoadFavoritesOutcome> {
  if (!isSupabaseConfigured) return { ok: true, ids: new Set() };
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("recipe_favorites")
        .select("recipe_id")
        .eq("user_id", userId),
      "Loading favorites",
    );
    if (error) {
      return {
        ok: false,
        ids: new Set(),
        message: messageFromUnknown(error, "Couldn't load favorites."),
      };
    }
    const ids = new Set<string>();
    for (const row of (data ?? []) as { recipe_id: string }[]) {
      ids.add(row.recipe_id);
    }
    return { ok: true, ids };
  } catch (error) {
    return {
      ok: false,
      ids: new Set(),
      message: messageFromUnknown(error, "Couldn't load favorites."),
    };
  }
}

export type ToggleFavoriteOutcome =
  | { ok: true; favorited: boolean }
  | { ok: false; message: string };

/**
 * Toggle a favorite. Idempotent: if the row exists we delete it, otherwise
 * we insert. UNIQUE(user_id, recipe_id) keeps duplicate inserts safe under
 * concurrent taps.
 */
export async function toggleRecipeFavorite(
  userId: string,
  recipeId: string,
  currentlyFavorited: boolean,
): Promise<ToggleFavoriteOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Supabase not configured." };
  }
  try {
    if (currentlyFavorited) {
      const { error } = await withTimeout(
        supabase
          .from("recipe_favorites")
          .delete()
          .eq("user_id", userId)
          .eq("recipe_id", recipeId),
        "Unfavoriting",
      );
      if (error) {
        return {
          ok: false,
          message: messageFromUnknown(error, "Couldn't unfavorite."),
        };
      }
      return { ok: true, favorited: false };
    }
    const { error } = await withTimeout(
      supabase
        .from("recipe_favorites")
        .insert({ user_id: userId, recipe_id: recipeId }),
      "Favoriting",
    );
    if (error) {
      // Duplicate insert (unique violation) is not an error semantically —
      // treat as "already favorited" and return success.
      const text = rawErrorText(error).toLowerCase();
      if (text.includes("duplicate") || text.includes("unique")) {
        return { ok: true, favorited: true };
      }
      return {
        ok: false,
        message: messageFromUnknown(error, "Couldn't favorite."),
      };
    }
    return { ok: true, favorited: true };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, "Couldn't toggle favorite."),
    };
  }
}
