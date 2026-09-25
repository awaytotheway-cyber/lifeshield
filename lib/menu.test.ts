/**
 *   npx --yes tsx --tsconfig tsconfig.json lib/menu.test.ts
 */
import assert from "node:assert/strict";
import {
  DEFAULT_MENU_ORDER,
  filterMenuItemsByFlags,
  MENU_ITEMS,
  menuItemIsActive,
  orderedMenuItems,
} from "./menu";
import type { FeatureFlagName } from "./feature-flags";

// Goals is in the default order.
assert.equal(DEFAULT_MENU_ORDER.includes("goals"), true);

// Goals requires the goals_v1 flag; nothing else in the default set does.
assert.equal(MENU_ITEMS.goals.requiresFlag, "goals_v1");
for (const id of DEFAULT_MENU_ORDER) {
  if (id === "goals") continue;
  assert.equal(
    MENU_ITEMS[id].requiresFlag,
    undefined,
    `unexpected requiresFlag on ${id}`,
  );
}

// With the flag off, Goals is filtered out; every stable item survives.
{
  const items = orderedMenuItems(DEFAULT_MENU_ORDER);
  const filtered = filterMenuItemsByFlags(items, () => false);
  assert.equal(filtered.some((item) => item.id === "goals"), false);
  for (const id of DEFAULT_MENU_ORDER) {
    if (id === "goals") continue;
    assert.equal(
      filtered.some((item) => item.id === id),
      true,
      `${id} unexpectedly filtered out`,
    );
  }
}

// With the flag on for goals_v1, Goals is shown.
{
  const items = orderedMenuItems(DEFAULT_MENU_ORDER);
  const filtered = filterMenuItemsByFlags(items, (flag: FeatureFlagName) =>
    flag === "goals_v1",
  );
  assert.equal(filtered.some((item) => item.id === "goals"), true);
}

// menuItemIsActive highlights Goals for both list and detail paths.
assert.equal(menuItemIsActive(MENU_ITEMS.goals, "/(main)/(goals)"), true);
assert.equal(
  menuItemIsActive(MENU_ITEMS.goals, "/(main)/(goals)/goal?id=abc"),
  true,
);
assert.equal(menuItemIsActive(MENU_ITEMS.goals, "/(main)/home"), false);

// eslint-disable-next-line no-console
console.log("menu.test.ts OK");
