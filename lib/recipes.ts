/**
 * Recipe library types + pure filter / search / sort helpers (Phase C).
 *
 * jsonb shape guards live in lib/recipes-parse.ts so tests can import them
 * without dragging Supabase / React Native into tsx — same pattern as
 * lib/intervention-templates{,-parse}.ts.
 */

import type {
  Ingredient,
  InstructionStep,
  Nutrition,
} from "@/lib/recipes-parse";

export type {
  Ingredient,
  InstructionStep,
  Nutrition,
} from "@/lib/recipes-parse";

export {
  parseIngredients,
  parseInstructions,
  parseNutrition,
} from "@/lib/recipes-parse";

export type Recipe = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  ingredients: Ingredient[];
  instructions: InstructionStep[];
  nutrition: Nutrition;
  tags: string[];
  /**
   * Rules-engine trigger findings this recipe supports. Empty for a generic
   * library recipe; populated by admin to make the plan detail surface it.
   */
  linked_findings: string[];
  prep_minutes: number | null;
  cook_minutes: number | null;
  servings: number | null;
  image_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type RecipeSummary = Pick<
  Recipe,
  | "id"
  | "slug"
  | "name"
  | "description"
  | "tags"
  | "linked_findings"
  | "prep_minutes"
  | "cook_minutes"
  | "servings"
  | "image_url"
  | "active"
>;

export type RecipeSortOrder = "name" | "quickest";

/**
 * Case-insensitive filter across name + description + tags. Also filters to
 * recipes that carry every one of the requested tags (AND, not OR — a filter
 * chip row narrows results, it doesn't broaden them).
 *
 * Inactive recipes are dropped regardless of query — inactive means "hide
 * from the library" for both admin drafts and retired content.
 */
export function filterRecipes(
  recipes: readonly RecipeSummary[],
  query: string,
  requiredTags: readonly string[] = [],
): RecipeSummary[] {
  const needle = query.trim().toLowerCase();
  const tagSet = requiredTags
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0);

  return recipes.filter((recipe) => {
    if (!recipe.active) return false;

    if (tagSet.length > 0) {
      const recipeTags = recipe.tags.map((t) => t.toLowerCase());
      const hasAll = tagSet.every((t) => recipeTags.includes(t));
      if (!hasAll) return false;
    }

    if (!needle) return true;
    const haystack = [
      recipe.name,
      recipe.description ?? "",
      ...recipe.tags,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

/**
 * Total prep + cook minutes. Missing values contribute 0; a recipe with no
 * timing info at all is treated as 0 (sorted first by "quickest").
 */
export function totalMinutes(
  recipe: Pick<RecipeSummary, "prep_minutes" | "cook_minutes">,
): number {
  const prep = recipe.prep_minutes ?? 0;
  const cook = recipe.cook_minutes ?? 0;
  return Math.max(0, prep) + Math.max(0, cook);
}

/**
 * Non-mutating sort. 'name' uses locale-aware compare; 'quickest' uses
 * totalMinutes and breaks ties by name so ordering is stable for the UI.
 */
export function sortRecipes(
  recipes: readonly RecipeSummary[],
  order: RecipeSortOrder,
): RecipeSummary[] {
  const next = [...recipes];
  if (order === "name") {
    next.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    next.sort((a, b) => {
      const diff = totalMinutes(a) - totalMinutes(b);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
  }
  return next;
}

/**
 * Unique tag list, sorted alphabetically. Used to render the filter chip
 * row above the recipe list. Case is preserved from the first occurrence.
 */
export function uniqueTags(recipes: readonly RecipeSummary[]): string[] {
  const byLower = new Map<string, string>();
  for (const recipe of recipes) {
    for (const tag of recipe.tags) {
      const key = tag.trim().toLowerCase();
      if (!key) continue;
      if (!byLower.has(key)) byLower.set(key, tag.trim());
    }
  }
  return Array.from(byLower.values()).sort((a, b) => a.localeCompare(b));
}
