/**
 *   npx --yes tsx --tsconfig tsconfig.json lib/recipes.test.ts
 */
import assert from "node:assert/strict";
import {
  filterRecipes,
  sortRecipes,
  totalMinutes,
  uniqueTags,
} from "./recipes";
import {
  parseIngredients,
  parseInstructions,
  parseNutrition,
} from "./recipes-parse";
import type { RecipeSummary } from "./recipes";

function summary(
  overrides: Partial<RecipeSummary> & { name: string },
): RecipeSummary {
  return {
    id: overrides.id ?? `id-${overrides.name}`,
    slug: overrides.slug ?? overrides.name.toLowerCase(),
    name: overrides.name,
    description: overrides.description ?? null,
    tags: overrides.tags ?? [],
    prep_minutes: overrides.prep_minutes ?? null,
    cook_minutes: overrides.cook_minutes ?? null,
    servings: overrides.servings ?? null,
    image_url: overrides.image_url ?? null,
    active: overrides.active ?? true,
  };
}

// ---------- filterRecipes ----------

const library: RecipeSummary[] = [
  summary({ name: "Green Smoothie", tags: ["breakfast", "quick", "vegan"] }),
  summary({ name: "Salmon Bowl", tags: ["dinner", "high-protein"] }),
  summary({ name: "Overnight Oats", tags: ["breakfast", "quick", "vegan"] }),
  summary({ name: "Draft Recipe", active: false, tags: ["draft"] }),
];

// Empty query → all active recipes.
{
  const rows = filterRecipes(library, "");
  assert.equal(rows.length, 3);
  assert.equal(rows.some((r) => r.name === "Draft Recipe"), false);
}

// Query matches name or tags case-insensitively.
{
  assert.equal(filterRecipes(library, "salmon").length, 1);
  assert.equal(filterRecipes(library, "SMOOTHIE").length, 1);
  assert.equal(filterRecipes(library, "vegan").length, 2);
}

// Tag filter narrows results (AND, not OR).
{
  const rows = filterRecipes(library, "", ["breakfast", "vegan"]);
  assert.equal(rows.length, 2);
}
{
  // Two tags that no active recipe has together → empty.
  const rows = filterRecipes(library, "", ["breakfast", "dinner"]);
  assert.equal(rows.length, 0);
}

// Inactive rows never leak, even for a query that would match.
assert.equal(filterRecipes(library, "draft").length, 0);

// ---------- totalMinutes ----------
assert.equal(totalMinutes({ prep_minutes: 5, cook_minutes: 10 }), 15);
assert.equal(totalMinutes({ prep_minutes: null, cook_minutes: 10 }), 10);
assert.equal(totalMinutes({ prep_minutes: null, cook_minutes: null }), 0);
// Negative values are clamped so a bad edit can't push a recipe above the
// list-sort baseline.
assert.equal(totalMinutes({ prep_minutes: -5, cook_minutes: 10 }), 10);

// ---------- sortRecipes ----------
{
  const rows = [
    summary({ name: "B", prep_minutes: 5, cook_minutes: 5 }),
    summary({ name: "A", prep_minutes: 20, cook_minutes: 0 }),
    summary({ name: "C", prep_minutes: 5, cook_minutes: 5 }),
  ];
  assert.deepEqual(
    sortRecipes(rows, "name").map((r) => r.name),
    ["A", "B", "C"],
  );
  // Quickest breaks ties by name so ordering is stable.
  assert.deepEqual(
    sortRecipes(rows, "quickest").map((r) => r.name),
    ["B", "C", "A"],
  );
}
// sortRecipes is non-mutating.
{
  const rows = [
    summary({ name: "B" }),
    summary({ name: "A" }),
  ];
  const _sorted = sortRecipes(rows, "name");
  assert.equal(rows[0].name, "B");
}

// ---------- uniqueTags ----------
{
  const tags = uniqueTags(library);
  // Case-preserved from first occurrence, sorted, duplicates collapsed.
  assert.deepEqual(tags, [
    "breakfast",
    "dinner",
    "draft",
    "high-protein",
    "quick",
    "vegan",
  ]);
}
{
  // Case collision keeps the first-seen casing.
  const rows = [
    summary({ name: "A", tags: ["Vegan"] }),
    summary({ name: "B", tags: ["vegan"] }),
  ];
  assert.deepEqual(uniqueTags(rows), ["Vegan"]);
}

// ---------- parseIngredients ----------
{
  const rows = parseIngredients([
    { name: "Rolled oats", amount: "1/2", unit: "cup" },
    { name: "Almond milk", amount: 1, unit: "cup" }, // numeric amount → coerced
    "Blueberries", // plain-string legacy shape
    { note: "no name" }, // missing name → dropped
    null,
  ]);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].amount, "1/2");
  assert.equal(rows[1].amount, "1");
  assert.equal(rows[2].name, "Blueberries");
}

// String-encoded jsonb (some Supabase clients) is parsed.
assert.equal(parseIngredients('[{"name":"x"}]').length, 1);
assert.deepEqual(parseIngredients(null), []);
assert.deepEqual(parseIngredients("garbage"), []);

// ---------- parseInstructions ----------
{
  // Auto-numbered from plain strings.
  const rows = parseInstructions([
    "Preheat oven",
    "Chop veg",
    "Bake for 20m",
  ]);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].step, 1);
  assert.equal(rows[2].step, 3);
}
{
  // Objects with explicit step numbers preserved; auto counter continues
  // past them.
  const rows = parseInstructions([
    { step: 1, text: "One" },
    { step: 5, text: "Five" },
    "Six",
  ]);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].step, 1);
  assert.equal(rows[1].step, 5);
  assert.equal(rows[2].step, 6);
}
// Blank / missing text is dropped.
assert.equal(
  parseInstructions([
    { step: 1, text: "" },
    { text: "  " },
  ]).length,
  0,
);

// ---------- parseNutrition ----------
{
  const n = parseNutrition({
    calories: 320,
    protein_g: 12,
    carbs_g: "not a number",
    fat_g: null,
    fiber_g: 5,
  });
  assert.equal(n.calories, 320);
  assert.equal(n.protein_g, 12);
  assert.equal(n.carbs_g, undefined);
  assert.equal(n.fat_g, undefined);
  assert.equal(n.fiber_g, 5);
}
assert.deepEqual(parseNutrition(null), {});
assert.deepEqual(parseNutrition("garbage"), {});
assert.deepEqual(parseNutrition([1, 2, 3]), {});

// eslint-disable-next-line no-console
console.log("recipes.test.ts OK");
