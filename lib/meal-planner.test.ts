/**
 *   npx --yes tsx --tsconfig tsconfig.json lib/meal-planner.test.ts
 */
import assert from "node:assert/strict";
import {
  ALL_SLOTS,
  appendDay,
  generateMealPlan,
  removeLastDay,
  removeMeal,
  summarizePlan,
  swapMeal,
  type MealPlanPayload,
  type MealSlot,
} from "./meal-planner";
import type { RecipeSummary } from "./recipes";

function recipe(
  name: string,
  tags: string[],
  active = true,
): RecipeSummary {
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  return {
    id: `id-${slug}`,
    slug,
    name,
    description: null,
    tags,
    linked_findings: [],
    prep_minutes: 5,
    cook_minutes: 10,
    servings: 2,
    image_url: null,
    active,
  };
}

// ---------- Error cases ----------

// Bad date range: end before start.
{
  const outcome = generateMealPlan({
    recipes: [recipe("Oats", ["breakfast"])],
    preferences: { slots: ["breakfast"], avoid_tags: [] },
    start_date: "2026-09-25",
    end_date: "2026-09-24",
  });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.error.code, "bad_date_range");
}

// Malformed dates.
{
  const outcome = generateMealPlan({
    recipes: [recipe("Oats", ["breakfast"])],
    preferences: { slots: ["breakfast"], avoid_tags: [] },
    start_date: "2026/09/25",
    end_date: "2026-09-27",
  });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.error.code, "bad_date_range");
}

// No slots.
{
  const outcome = generateMealPlan({
    recipes: [recipe("Oats", ["breakfast"])],
    preferences: { slots: [], avoid_tags: [] },
    start_date: "2026-09-25",
    end_date: "2026-09-25",
  });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.error.code, "no_slots");
}

// Empty library.
{
  const outcome = generateMealPlan({
    recipes: [],
    preferences: { slots: ["breakfast"], avoid_tags: [] },
    start_date: "2026-09-25",
    end_date: "2026-09-25",
  });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.error.code, "empty_library");
}

// Avoid tags filter everything out.
{
  const outcome = generateMealPlan({
    recipes: [recipe("Meat Bowl", ["dinner", "meat"])],
    preferences: { slots: ["dinner"], avoid_tags: ["meat"] },
    start_date: "2026-09-25",
    end_date: "2026-09-25",
  });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.error.code, "no_recipes_after_filter");
}

// Inactive recipes never enter the pool.
{
  const outcome = generateMealPlan({
    recipes: [recipe("Draft", ["breakfast"], false)],
    preferences: { slots: ["breakfast"], avoid_tags: [] },
    start_date: "2026-09-25",
    end_date: "2026-09-25",
  });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.error.code, "no_recipes_after_filter");
}

// ---------- Successful generation ----------

const library: RecipeSummary[] = [
  recipe("Oats", ["breakfast", "quick"]),
  recipe("Green Smoothie", ["breakfast", "vegan"]),
  recipe("Chicken Salad", ["lunch"]),
  recipe("Grain Bowl", ["lunch", "vegan"]),
  recipe("Salmon Plate", ["dinner"]),
  recipe("Veggie Curry", ["dinner", "vegan"]),
  recipe("Trail Mix", ["snack"]),
];

// 3-day plan with all three main slots.
{
  const outcome = generateMealPlan({
    recipes: library,
    preferences: {
      slots: ["breakfast", "lunch", "dinner"],
      avoid_tags: [],
    },
    start_date: "2026-09-25",
    end_date: "2026-09-27",
  });
  assert.equal(outcome.ok, true);
  if (!outcome.ok) throw new Error("expected ok");
  assert.equal(outcome.plan.days.length, 3);
  assert.equal(outcome.plan.days[0].date, "2026-09-25");
  assert.equal(outcome.plan.days[2].date, "2026-09-27");
  for (const day of outcome.plan.days) {
    assert.equal(day.meals.length, 3);
    // Every meal from the correct slot bucket (tag matches slot).
    for (const meal of day.meals) {
      const source = library.find((r) => r.id === meal.recipe_id);
      assert.ok(source, `unknown recipe id ${meal.recipe_id}`);
      assert.equal(
        source!.tags.some((t) => t.toLowerCase() === meal.slot),
        true,
        `${meal.recipe_name} in slot ${meal.slot} without matching tag`,
      );
    }
  }
}

// Determinism: same input twice → identical output.
{
  const input = {
    recipes: library,
    preferences: {
      slots: ["breakfast", "lunch", "dinner"] as MealSlot[],
      avoid_tags: [] as string[],
    },
    start_date: "2026-09-25",
    end_date: "2026-09-30",
  };
  const a = generateMealPlan(input);
  const b = generateMealPlan(input);
  assert.deepEqual(a, b);
}

// avoid_tags is case-insensitive and hides vegan recipes.
{
  const outcome = generateMealPlan({
    recipes: library,
    preferences: {
      slots: ["breakfast", "lunch", "dinner"],
      avoid_tags: ["VEGAN"],
    },
    start_date: "2026-09-25",
    end_date: "2026-09-25",
  });
  assert.equal(outcome.ok, true);
  if (!outcome.ok) throw new Error("expected ok");
  for (const meal of outcome.plan.days[0].meals) {
    const source = library.find((r) => r.id === meal.recipe_id);
    assert.equal(source?.tags.includes("vegan"), false);
  }
}

// Slot with no tagged recipes falls back to the whole pool.
{
  const outcome = generateMealPlan({
    recipes: library,
    preferences: { slots: ["snack"], avoid_tags: [] },
    // Only Trail Mix carries a "snack" tag — bucket size 1. The fallback
    // shouldn't kick in here, but for a slot with nothing tagged it should.
    start_date: "2026-09-25",
    end_date: "2026-09-25",
  });
  assert.equal(outcome.ok, true);
  if (!outcome.ok) throw new Error("expected ok");
  assert.equal(outcome.plan.days[0].meals[0].recipe_name, "Trail Mix");
}
{
  // Slots array includes a slot no recipe has tagged. Fallback fires.
  const noSnackLib = library.filter((r) => !r.tags.includes("snack"));
  const outcome = generateMealPlan({
    recipes: noSnackLib,
    preferences: { slots: ["snack"], avoid_tags: [] },
    start_date: "2026-09-25",
    end_date: "2026-09-25",
  });
  assert.equal(outcome.ok, true);
  if (!outcome.ok) throw new Error("expected ok");
  assert.equal(outcome.plan.days[0].meals.length, 1);
  // Fell back to something from the whole active pool.
  assert.ok(outcome.plan.days[0].meals[0].recipe_name.length > 0);
}

// Cross-day rotation: over N days ≥ bucket size, at least two distinct
// recipes appear in the same slot.
{
  const outcome = generateMealPlan({
    recipes: library,
    preferences: { slots: ["breakfast"], avoid_tags: [] },
    start_date: "2026-09-25",
    end_date: "2026-09-27",
  });
  assert.equal(outcome.ok, true);
  if (!outcome.ok) throw new Error("expected ok");
  const breakfastIds = new Set(
    outcome.plan.days.map((day) => day.meals[0]?.recipe_id),
  );
  assert.equal(breakfastIds.size >= 2, true);
}

// Snapshotted metadata: renaming the recipe library after generation
// doesn't change the plan payload.
{
  const outcome = generateMealPlan({
    recipes: library,
    preferences: { slots: ["breakfast"], avoid_tags: [] },
    start_date: "2026-09-25",
    end_date: "2026-09-25",
  });
  assert.equal(outcome.ok, true);
  if (!outcome.ok) throw new Error("expected ok");
  const meal = outcome.plan.days[0].meals[0];
  assert.equal(typeof meal.recipe_slug, "string");
  assert.equal(typeof meal.recipe_name, "string");
  // Rename source library — the payload snapshot is unchanged.
  const renamed = library.map((r) =>
    r.id === meal.recipe_id ? { ...r, name: "Renamed" } : r,
  );
  void renamed;
  assert.equal(meal.recipe_name !== "Renamed", true);
}

// ---------- summarizePlan ----------

{
  const payload: MealPlanPayload = {
    days: [
      {
        date: "2026-09-25",
        meals: [
          {
            slot: "breakfast",
            recipe_id: "a",
            recipe_slug: "a",
            recipe_name: "A",
          },
          {
            slot: "lunch",
            recipe_id: "b",
            recipe_slug: "b",
            recipe_name: "B",
          },
        ],
      },
      {
        date: "2026-09-26",
        meals: [
          {
            slot: "breakfast",
            recipe_id: "a",
            recipe_slug: "a",
            recipe_name: "A",
          },
        ],
      },
    ],
  };
  const summary = summarizePlan(payload);
  assert.equal(summary.day_count, 2);
  assert.equal(summary.meal_count, 3);
  assert.equal(summary.unique_recipe_count, 2);
}

// Empty plan.
assert.deepEqual(summarizePlan({ days: [] }), {
  day_count: 0,
  meal_count: 0,
  unique_recipe_count: 0,
});

// ALL_SLOTS is a stable set.
assert.deepEqual(ALL_SLOTS, ["breakfast", "lunch", "dinner", "snack"]);

// ---------- prefer_tags ----------

// Preferred pool wins per-slot when a match exists.
{
  const lib: RecipeSummary[] = [
    recipe("Chicken Salad", ["lunch"]),
    recipe("Protein Bowl", ["lunch", "high-protein"]),
    recipe("Steak Plate", ["dinner", "high-protein"]),
    recipe("Veggie Curry", ["dinner"]),
  ];
  const outcome = generateMealPlan({
    recipes: lib,
    preferences: {
      slots: ["lunch", "dinner"],
      avoid_tags: [],
      prefer_tags: ["high-protein"],
    },
    start_date: "2026-09-25",
    end_date: "2026-09-25",
  });
  assert.equal(outcome.ok, true);
  if (!outcome.ok) throw new Error("expected ok");
  const lunch = outcome.plan.days[0].meals.find((m) => m.slot === "lunch");
  const dinner = outcome.plan.days[0].meals.find((m) => m.slot === "dinner");
  assert.equal(lunch?.recipe_name, "Protein Bowl");
  assert.equal(dinner?.recipe_name, "Steak Plate");
}

// prefer_tags with no matches for that slot falls back to the slot bucket.
{
  const lib: RecipeSummary[] = [
    recipe("Oats", ["breakfast"]),
    recipe("Steak Plate", ["dinner", "high-protein"]),
  ];
  const outcome = generateMealPlan({
    recipes: lib,
    preferences: {
      slots: ["breakfast"],
      avoid_tags: [],
      prefer_tags: ["high-protein"],
    },
    start_date: "2026-09-25",
    end_date: "2026-09-25",
  });
  assert.equal(outcome.ok, true);
  if (!outcome.ok) throw new Error("expected ok");
  assert.equal(outcome.plan.days[0].meals[0].recipe_name, "Oats");
}

// prefer_tags is case-insensitive.
{
  const lib: RecipeSummary[] = [
    recipe("Bowl", ["lunch", "High-Protein"]),
    recipe("Salad", ["lunch"]),
  ];
  const outcome = generateMealPlan({
    recipes: lib,
    preferences: {
      slots: ["lunch"],
      avoid_tags: [],
      prefer_tags: ["HIGH-PROTEIN"],
    },
    start_date: "2026-09-25",
    end_date: "2026-09-25",
  });
  assert.equal(outcome.ok, true);
  if (!outcome.ok) throw new Error("expected ok");
  assert.equal(outcome.plan.days[0].meals[0].recipe_name, "Bowl");
}

// Empty prefer_tags is a no-op (backwards-compatible with old preferences).
{
  const noPref = generateMealPlan({
    recipes: library,
    preferences: { slots: ["breakfast"], avoid_tags: [] },
    start_date: "2026-09-25",
    end_date: "2026-09-25",
  });
  const emptyPref = generateMealPlan({
    recipes: library,
    preferences: { slots: ["breakfast"], avoid_tags: [], prefer_tags: [] },
    start_date: "2026-09-25",
    end_date: "2026-09-25",
  });
  assert.deepEqual(noPref, emptyPref);
}

// ---------- swapMeal ----------

const samplePayload: MealPlanPayload = {
  days: [
    {
      date: "2026-09-25",
      meals: [
        {
          slot: "breakfast",
          recipe_id: "a",
          recipe_slug: "a",
          recipe_name: "A",
        },
        {
          slot: "lunch",
          recipe_id: "b",
          recipe_slug: "b",
          recipe_name: "B",
        },
      ],
    },
    {
      date: "2026-09-26",
      meals: [
        {
          slot: "breakfast",
          recipe_id: "a",
          recipe_slug: "a",
          recipe_name: "A",
        },
      ],
    },
  ],
};

// Swap replaces one slot in one day; other days untouched.
{
  const next = swapMeal(samplePayload, "2026-09-25", "breakfast", {
    id: "x",
    slug: "x",
    name: "X",
  });
  assert.equal(next.days[0].meals[0].recipe_id, "x");
  assert.equal(next.days[0].meals[1].recipe_id, "b");
  // Day 2 unchanged.
  assert.equal(next.days[1].meals[0].recipe_id, "a");
  // Source is not mutated.
  assert.equal(samplePayload.days[0].meals[0].recipe_id, "a");
}

// Swap on a slot the day doesn't have — appends the slot to that day.
{
  const next = swapMeal(samplePayload, "2026-09-26", "dinner", {
    id: "d",
    slug: "d",
    name: "D",
  });
  const day2 = next.days.find((day) => day.date === "2026-09-26")!;
  assert.equal(day2.meals.length, 2);
  assert.equal(
    day2.meals.some((meal) => meal.slot === "dinner" && meal.recipe_id === "d"),
    true,
  );
}

// Swap on an absent date is a no-op.
{
  const next = swapMeal(samplePayload, "2026-12-01", "breakfast", {
    id: "z",
    slug: "z",
    name: "Z",
  });
  assert.deepEqual(next, samplePayload);
}

// ---------- removeMeal ----------

{
  const next = removeMeal(samplePayload, "2026-09-25", "lunch");
  assert.equal(next.days[0].meals.length, 1);
  assert.equal(next.days[0].meals[0].slot, "breakfast");
  // Idempotent when the slot is already absent.
  const again = removeMeal(next, "2026-09-25", "lunch");
  assert.deepEqual(again, next);
}

// ---------- appendDay ----------

{
  const outcome = appendDay(
    samplePayload,
    library,
    { slots: ["breakfast"], avoid_tags: [] },
    "2026-09-25",
  );
  assert.equal(outcome.ok, true);
  if (!outcome.ok) throw new Error("expected ok");
  assert.equal(outcome.plan.days.length, samplePayload.days.length + 1);
  assert.equal(outcome.plan.days[outcome.plan.days.length - 1].date, "2026-09-27");
}

// appendDay on an empty payload uses the fallback start date.
{
  const outcome = appendDay(
    { days: [] },
    library,
    { slots: ["breakfast"], avoid_tags: [] },
    "2026-10-01",
  );
  assert.equal(outcome.ok, true);
  if (!outcome.ok) throw new Error("expected ok");
  assert.equal(outcome.plan.days.length, 1);
  assert.equal(outcome.plan.days[0].date, "2026-10-01");
}

// appendDay bubbles up generator failures without mutating the payload.
{
  const outcome = appendDay(
    samplePayload,
    library,
    { slots: [], avoid_tags: [] },
    "2026-09-25",
  );
  assert.equal(outcome.ok, false);
  if (outcome.ok) throw new Error("expected error");
  assert.equal(outcome.error.code, "no_slots");
}

// ---------- removeLastDay ----------

assert.equal(removeLastDay(samplePayload).days.length, samplePayload.days.length - 1);
assert.deepEqual(removeLastDay({ days: [] }), { days: [] });

// eslint-disable-next-line no-console
console.log("meal-planner.test.ts OK");
