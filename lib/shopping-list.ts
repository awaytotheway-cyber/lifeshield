/**
 * Turn a meal plan's recipe ingredients into a shopping list matched to
 * store products (Phase C, ingredient → cart bridge).
 *
 * Pure logic only. IO lives in lib/cart-io.ts and the screen fetches the
 * required recipes + products separately so this file can stay testable
 * without a Supabase connection.
 *
 * Match rate is expected to be low today: the products catalogue is
 * supplements + tests, not groceries. The pipeline is deliberately loose
 * (case-insensitive substring, either direction) so it lights up cleanly
 * once pantry / grocery products land in public.products.
 */

import type { Ingredient } from "@/lib/recipes-parse";

export type ProductLite = {
  id: string;
  plain_name: string;
  clinical_name: string;
  price: number;
  currency: string;
  active: boolean;
};

/**
 * A single ingredient rolled up across every recipe in the plan that used it.
 * Free-form amounts are collected verbatim (we don't try to sum "1/2 cup"
 * with "a pinch") so the UI can display them as source hints.
 */
export type AggregatedIngredient = {
  /** Lowercased canonical name — used as the aggregation key. */
  key: string;
  /** Display casing (first occurrence wins). */
  display_name: string;
  /** Distinct recipe names this ingredient came from, in first-seen order. */
  used_in_recipes: string[];
  /** Free-form amount strings, first-seen order, one per occurrence. */
  amounts: string[];
};

export type MatchedItem = {
  ingredient: AggregatedIngredient;
  product: ProductLite;
  /**
   * How the match was made. Useful for the UI to explain a surprising match
   * ("we matched 'oats' to 'Bio-Oats Complex' because the product name
   * contains 'oats'"), and for the test to assert priority ordering.
   */
  match_kind: "exact" | "product_contains" | "ingredient_contains";
};

export type UnmatchedItem = {
  ingredient: AggregatedIngredient;
};

export type ShoppingList = {
  matched: MatchedItem[];
  unmatched: UnmatchedItem[];
};

export type RecipeWithIngredients = {
  id: string;
  name: string;
  ingredients: Ingredient[];
};

/**
 * Roll up ingredients across every recipe. Duplicate ingredient names
 * collapse to one entry with `used_in_recipes` growing per source.
 *
 * Ordering: first-seen across the input recipes. The caller sorts alphabetically
 * for display when it matters; the raw aggregation stays predictable so the
 * shopping-list screen and the tests both key on the same order.
 */
export function aggregateIngredients(
  recipes: readonly RecipeWithIngredients[],
): AggregatedIngredient[] {
  const byKey = new Map<string, AggregatedIngredient>();
  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      const name = ingredient.name.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      let entry = byKey.get(key);
      if (!entry) {
        entry = {
          key,
          display_name: name,
          used_in_recipes: [],
          amounts: [],
        };
        byKey.set(key, entry);
      }
      if (!entry.used_in_recipes.includes(recipe.name)) {
        entry.used_in_recipes.push(recipe.name);
      }
      const amountLine = [ingredient.amount, ingredient.unit]
        .filter((v) => typeof v === "string" && v.length > 0)
        .join(" ")
        .trim();
      if (amountLine) entry.amounts.push(amountLine);
    }
  }
  return Array.from(byKey.values());
}

/**
 * Match aggregated ingredients to active products.
 *
 * Priority per ingredient:
 *   1. Exact case-insensitive match on plain_name or clinical_name.
 *   2. Product's plain_name / clinical_name contains the ingredient name.
 *   3. Ingredient name contains the product's plain_name.
 * Ties within a tier resolve by first product in the input array — callers
 * that need a preferred product order sort before calling.
 *
 * Inactive products are skipped: a matched-but-inactive result would give
 * the user a broken add-to-cart button.
 */
export function matchIngredientsToProducts(
  ingredients: readonly AggregatedIngredient[],
  products: readonly ProductLite[],
): ShoppingList {
  const activeProducts = products.filter((product) => product.active);

  // Pre-normalise so we don't re-lowercase inside the inner loop.
  type NormalisedProduct = ProductLite & {
    lc_plain: string;
    lc_clinical: string;
  };
  const normalised: NormalisedProduct[] = activeProducts.map((product) => ({
    ...product,
    lc_plain: product.plain_name.toLowerCase(),
    lc_clinical: product.clinical_name.toLowerCase(),
  }));

  const matched: MatchedItem[] = [];
  const unmatched: UnmatchedItem[] = [];

  for (const ingredient of ingredients) {
    const key = ingredient.key;
    let hit:
      | (NormalisedProduct & { kind: MatchedItem["match_kind"] })
      | null = null;

    // Tier 1: exact.
    for (const product of normalised) {
      if (product.lc_plain === key || product.lc_clinical === key) {
        hit = { ...product, kind: "exact" };
        break;
      }
    }
    // Tier 2: product name contains ingredient.
    if (!hit) {
      for (const product of normalised) {
        if (
          product.lc_plain.includes(key) ||
          product.lc_clinical.includes(key)
        ) {
          hit = { ...product, kind: "product_contains" };
          break;
        }
      }
    }
    // Tier 3: ingredient contains product name (only for products with a
    // 3+ char name to avoid noise like a "Fe" product matching "coffee").
    if (!hit) {
      for (const product of normalised) {
        if (product.lc_plain.length < 3 && product.lc_clinical.length < 3) {
          continue;
        }
        if (
          (product.lc_plain.length >= 3 && key.includes(product.lc_plain)) ||
          (product.lc_clinical.length >= 3 && key.includes(product.lc_clinical))
        ) {
          hit = { ...product, kind: "ingredient_contains" };
          break;
        }
      }
    }

    if (hit) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { lc_plain, lc_clinical, kind, ...product } = hit;
      matched.push({ ingredient, product, match_kind: kind });
    } else {
      unmatched.push({ ingredient });
    }
  }

  return { matched, unmatched };
}

/**
 * Unique product ids from a matched list, in first-seen order. Feeds the
 * bulk add-to-cart call so we don't try to insert the same product twice
 * when two ingredients matched the same row.
 */
export function distinctProductIds(matched: readonly MatchedItem[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of matched) {
    if (seen.has(item.product.id)) continue;
    seen.add(item.product.id);
    out.push(item.product.id);
  }
  return out;
}
