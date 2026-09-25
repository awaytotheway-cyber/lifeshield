/**
 *   npx --yes tsx --tsconfig tsconfig.json lib/shopping-list.test.ts
 */
import assert from "node:assert/strict";
import {
  aggregateIngredients,
  distinctProductIds,
  matchIngredientsToProducts,
  type ProductLite,
  type RecipeWithIngredients,
} from "./shopping-list";

function product(
  overrides: Partial<ProductLite> & { plain_name: string },
): ProductLite {
  return {
    id: overrides.id ?? `p-${overrides.plain_name}`,
    plain_name: overrides.plain_name,
    clinical_name: overrides.clinical_name ?? overrides.plain_name,
    price: overrides.price ?? 100,
    currency: overrides.currency ?? "INR",
    active: overrides.active ?? true,
  };
}

// ---------- aggregateIngredients ----------

// Duplicate ingredient across two recipes collapses to one entry.
{
  const recipes: RecipeWithIngredients[] = [
    {
      id: "r1",
      name: "Oats",
      ingredients: [{ name: "Rolled oats", amount: "1/2", unit: "cup" }],
    },
    {
      id: "r2",
      name: "Smoothie",
      ingredients: [{ name: "rolled oats", amount: "1", unit: "tbsp" }],
    },
  ];
  const rows = aggregateIngredients(recipes);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].key, "rolled oats");
  assert.equal(rows[0].display_name, "Rolled oats");
  assert.deepEqual(rows[0].used_in_recipes, ["Oats", "Smoothie"]);
  assert.deepEqual(rows[0].amounts, ["1/2 cup", "1 tbsp"]);
}

// Blank ingredient names are dropped.
{
  const rows = aggregateIngredients([
    {
      id: "r",
      name: "R",
      ingredients: [{ name: " " }, { name: "Salt" }],
    },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].display_name, "Salt");
}

// A recipe listing the same ingredient twice adds two amount entries but
// only one used_in_recipes entry (since the source recipe name is the same).
{
  const rows = aggregateIngredients([
    {
      id: "r",
      name: "Curry",
      ingredients: [
        { name: "Onion", amount: "1" },
        { name: "onion", amount: "1/2" },
      ],
    },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].used_in_recipes.length, 1);
  assert.equal(rows[0].amounts.length, 2);
}

// Ingredients with no amount don't leave an empty string in `amounts`.
{
  const rows = aggregateIngredients([
    {
      id: "r",
      name: "R",
      ingredients: [{ name: "Water" }],
    },
  ]);
  assert.equal(rows[0].amounts.length, 0);
}

// ---------- matchIngredientsToProducts ----------

const ingredients = aggregateIngredients([
  {
    id: "r1",
    name: "R1",
    ingredients: [
      { name: "Turmeric" },
      { name: "Vitamin D3" },
      { name: "oats" },
      { name: "Random Herb" },
    ],
  },
]);

// Tier 1: exact match.
{
  const products = [
    product({ plain_name: "Turmeric", id: "p1" }),
    product({ plain_name: "Multivitamin", id: "p2" }),
  ];
  const list = matchIngredientsToProducts(ingredients, products);
  const turmeric = list.matched.find((m) => m.ingredient.key === "turmeric");
  assert.equal(turmeric?.match_kind, "exact");
  assert.equal(turmeric?.product.id, "p1");
}

// Tier 2: product name contains ingredient ("Vitamin D3 2000 IU").
{
  const products = [
    product({ plain_name: "Vitamin D3 2000 IU", id: "vd3" }),
    product({ plain_name: "Multivitamin", id: "mv" }),
  ];
  const list = matchIngredientsToProducts(ingredients, products);
  const d3 = list.matched.find((m) => m.ingredient.key === "vitamin d3");
  assert.equal(d3?.match_kind, "product_contains");
  assert.equal(d3?.product.id, "vd3");
}

// Tier 3: ingredient contains product name — with 3+ char safeguard.
{
  const products = [
    product({ plain_name: "Fe", id: "fe" }), // < 3 chars, must be skipped
    product({ plain_name: "oat", id: "oat" }), // matches "oats"
  ];
  const list = matchIngredientsToProducts(ingredients, products);
  const oats = list.matched.find((m) => m.ingredient.key === "oats");
  assert.equal(oats?.match_kind, "ingredient_contains");
  assert.equal(oats?.product.id, "oat");
  // The 2-char "Fe" product should not spuriously match anything.
  assert.equal(list.matched.some((m) => m.product.id === "fe"), false);
}

// Priority: exact wins over product_contains wins over ingredient_contains.
{
  const products = [
    product({ plain_name: "oat", id: "oat-contains" }), // tier 3
    product({ plain_name: "Bio-Oats Complex", id: "bio-oats" }), // tier 2
    product({ plain_name: "oats", id: "oats-exact" }), // tier 1
  ];
  const list = matchIngredientsToProducts(ingredients, products);
  const oats = list.matched.find((m) => m.ingredient.key === "oats");
  assert.equal(oats?.match_kind, "exact");
  assert.equal(oats?.product.id, "oats-exact");
}

// Inactive products are ignored even on an exact name match.
{
  const products = [product({ plain_name: "Turmeric", id: "t", active: false })];
  const list = matchIngredientsToProducts(ingredients, products);
  assert.equal(list.matched.some((m) => m.ingredient.key === "turmeric"), false);
  assert.equal(list.unmatched.some((u) => u.ingredient.key === "turmeric"), true);
}

// Unmatched ingredients land in `unmatched`.
{
  const list = matchIngredientsToProducts(ingredients, []);
  assert.equal(list.matched.length, 0);
  assert.equal(
    list.unmatched.some((u) => u.ingredient.key === "random herb"),
    true,
  );
}

// clinical_name is also considered.
{
  const products = [
    product({
      plain_name: "Turmeric Blend",
      clinical_name: "Curcuma longa",
      id: "cl",
    }),
  ];
  const list = matchIngredientsToProducts(
    aggregateIngredients([
      { id: "r", name: "R", ingredients: [{ name: "Curcuma longa" }] },
    ]),
    products,
  );
  assert.equal(list.matched[0]?.match_kind, "exact");
  assert.equal(list.matched[0]?.product.id, "cl");
}

// ---------- distinctProductIds ----------
{
  const list = matchIngredientsToProducts(
    aggregateIngredients([
      {
        id: "r",
        name: "R",
        ingredients: [{ name: "Turmeric" }, { name: "Turmeric" }],
      },
    ]),
    [product({ plain_name: "Turmeric", id: "p" })],
  );
  // Two ingredients (well, aggregated to one), one product.
  const ids = distinctProductIds(list.matched);
  assert.deepEqual(ids, ["p"]);
}
{
  // Multiple matched items pointing at the same product still dedupe.
  const items = [
    {
      ingredient: {
        key: "a",
        display_name: "A",
        used_in_recipes: [],
        amounts: [],
      },
      product: product({ plain_name: "P", id: "p" }),
      match_kind: "exact" as const,
    },
    {
      ingredient: {
        key: "b",
        display_name: "B",
        used_in_recipes: [],
        amounts: [],
      },
      product: product({ plain_name: "P", id: "p" }),
      match_kind: "exact" as const,
    },
  ];
  assert.deepEqual(distinctProductIds(items), ["p"]);
}

// eslint-disable-next-line no-console
console.log("shopping-list.test.ts OK");
