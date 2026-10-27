/**
 * Unit checks for feature-flags. No framework — throws on failure.
 *
 *   npx --yes tsx --tsconfig tsconfig.json lib/feature-flags.test.ts
 */
import assert from "node:assert/strict";
import {
  FEATURE_FLAG_DEFAULTS,
  isFeatureEnabled,
  resolveFeatureFlags,
} from "./feature-flags";

// Default is off, and a null profile returns the default.
assert.equal(FEATURE_FLAG_DEFAULTS.goals_v1, false);
assert.equal(FEATURE_FLAG_DEFAULTS.reminders_v1, false);
assert.equal(FEATURE_FLAG_DEFAULTS.plan_v2, false);
assert.equal(FEATURE_FLAG_DEFAULTS.recipes_v1, false);
assert.equal(FEATURE_FLAG_DEFAULTS.meal_planner_v1, false);
assert.equal(FEATURE_FLAG_DEFAULTS.test_booking_v1, false);
assert.equal(FEATURE_FLAG_DEFAULTS.supplements_v2, false);
assert.equal(FEATURE_FLAG_DEFAULTS.genetic_testing_v1, false);
assert.equal(FEATURE_FLAG_DEFAULTS.social_v1, false);
assert.equal(isFeatureEnabled(null, "goals_v1"), false);
assert.equal(isFeatureEnabled(undefined, "goals_v1"), false);
assert.equal(isFeatureEnabled({}, "goals_v1"), false);
assert.equal(isFeatureEnabled(null, "reminders_v1"), false);
assert.equal(isFeatureEnabled(null, "plan_v2"), false);
assert.equal(isFeatureEnabled(null, "recipes_v1"), false);
assert.equal(isFeatureEnabled(null, "meal_planner_v1"), false);
assert.equal(isFeatureEnabled(null, "test_booking_v1"), false);
assert.equal(isFeatureEnabled(null, "supplements_v2"), false);
assert.equal(isFeatureEnabled(null, "genetic_testing_v1"), false);
assert.equal(isFeatureEnabled(null, "social_v1"), false);
assert.equal(isFeatureEnabled(undefined, "social_v1"), false);
assert.equal(isFeatureEnabled({}, "social_v1"), false);

// A per-user boolean override wins over the default.
assert.equal(
  isFeatureEnabled({ feature_flags: { goals_v1: true } }, "goals_v1"),
  true,
);
assert.equal(
  isFeatureEnabled({ feature_flags: { goals_v1: false } }, "goals_v1"),
  false,
);

// social_v1 ships off, so the beta path — a per-user override to true — is
// the only way it lights up. That path is the one worth asserting.
assert.equal(
  isFeatureEnabled({ feature_flags: { social_v1: true } }, "social_v1"),
  true,
);
assert.equal(
  isFeatureEnabled({ feature_flags: { social_v1: false } }, "social_v1"),
  false,
);
assert.equal(
  isFeatureEnabled(
    { feature_flags: { social_v1: "true" as unknown as boolean } },
    "social_v1",
  ),
  false,
);
assert.equal(
  resolveFeatureFlags({ feature_flags: { social_v1: true } }).social_v1,
  true,
);

// Non-boolean overrides are ignored (accidental strings / numbers must not
// enable a feature).
assert.equal(
  isFeatureEnabled(
    { feature_flags: { goals_v1: "true" as unknown as boolean } },
    "goals_v1",
  ),
  false,
);
assert.equal(
  isFeatureEnabled(
    { feature_flags: { goals_v1: 1 as unknown as boolean } },
    "goals_v1",
  ),
  false,
);

// resolveFeatureFlags returns the full effective map.
const resolved = resolveFeatureFlags({ feature_flags: { goals_v1: true } });
assert.equal(resolved.goals_v1, true);

// Unknown keys in the jsonb blob do not leak into the resolved map.
const fromUnknown = resolveFeatureFlags({
  feature_flags: { not_a_real_flag: true } as Record<string, unknown>,
});
assert.deepEqual(fromUnknown, {
  goals_v1: false,
  reminders_v1: false,
  plan_v2: false,
  recipes_v1: false,
  meal_planner_v1: false,
  test_booking_v1: false,
  supplements_v2: false,
  genetic_testing_v1: false,
  social_v1: false,
});

// eslint-disable-next-line no-console
console.log("feature-flags.test.ts OK");
