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

// Goals and Reminders are in the default order.
assert.equal(DEFAULT_MENU_ORDER.includes("goals"), true);
assert.equal(DEFAULT_MENU_ORDER.includes("reminders"), true);

// Goals requires goals_v1; Reminders requires reminders_v1; nothing else in
// the default set carries a flag requirement.
assert.equal(MENU_ITEMS.goals.requiresFlag, "goals_v1");
assert.equal(MENU_ITEMS.reminders.requiresFlag, "reminders_v1");
const FLAG_GATED: readonly string[] = ["goals", "reminders"];
for (const id of DEFAULT_MENU_ORDER) {
  if (FLAG_GATED.includes(id)) continue;
  assert.equal(
    MENU_ITEMS[id].requiresFlag,
    undefined,
    `unexpected requiresFlag on ${id}`,
  );
}

// With both flags off, only the stable items survive.
{
  const items = orderedMenuItems(DEFAULT_MENU_ORDER);
  const filtered = filterMenuItemsByFlags(items, () => false);
  for (const id of FLAG_GATED) {
    assert.equal(
      filtered.some((item) => item.id === id),
      false,
      `${id} should be hidden when its flag is off`,
    );
  }
  for (const id of DEFAULT_MENU_ORDER) {
    if (FLAG_GATED.includes(id)) continue;
    assert.equal(
      filtered.some((item) => item.id === id),
      true,
      `${id} unexpectedly filtered out`,
    );
  }
}

// Turning on a single flag surfaces only that row.
{
  const items = orderedMenuItems(DEFAULT_MENU_ORDER);
  const filtered = filterMenuItemsByFlags(items, (flag: FeatureFlagName) =>
    flag === "goals_v1",
  );
  assert.equal(filtered.some((item) => item.id === "goals"), true);
  assert.equal(filtered.some((item) => item.id === "reminders"), false);
}

// menuItemIsActive highlights Goals and Reminders for their list and detail paths.
assert.equal(menuItemIsActive(MENU_ITEMS.goals, "/(main)/(goals)"), true);
assert.equal(
  menuItemIsActive(MENU_ITEMS.goals, "/(main)/(goals)/goal?id=abc"),
  true,
);
assert.equal(menuItemIsActive(MENU_ITEMS.goals, "/(main)/home"), false);
assert.equal(
  menuItemIsActive(MENU_ITEMS.reminders, "/(main)/(reminders)"),
  true,
);
assert.equal(
  menuItemIsActive(MENU_ITEMS.reminders, "/(main)/(reminders)/reminder?id=x"),
  true,
);
assert.equal(
  menuItemIsActive(MENU_ITEMS.reminders, "/(main)/(settings)/notifications"),
  false,
);

// eslint-disable-next-line no-console
console.log("menu.test.ts OK");
