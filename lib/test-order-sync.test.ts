/**
 * Reconciling recommended tests with what is already in `test_orders`.
 *
 *   npm run test:test-order-sync
 *
 * The questionnaire used to delete every test_orders row for the patient and
 * insert the engine's list again. That is only safe while every row is still
 * "recommended". A purchase moves a row to "ordered" (server-side), so a
 * delete-and-reinsert would erase an order the patient had paid for and put
 * back a fresh "recommended" row to be paid for twice. Tier 3 is now written
 * as soon as the pathway opens, which makes that window real, so the sync only
 * ever touches rows still "recommended".
 */
import assert from "node:assert/strict";
import { planOrderSync } from "./test-order-sync";

type Want = { test_tier: 1 | 2 | 3 | 4; test_name: string; trigger_reason: string };
const want = (name: string, tier: 1 | 2 | 3 | 4 = 3, reason = "r"): Want => ({
  test_tier: tier,
  test_name: name,
  trigger_reason: reason,
});
const have = (id: string, name: string, status: string, reason = "r", tier = 3) => ({
  id,
  test_name: name,
  test_tier: tier,
  status,
  trigger_reason: reason,
});

// Nothing there yet: everything wanted is inserted.
{
  const plan = planOrderSync([], [want("a"), want("b")], { removeStale: false });
  assert.deepEqual(plan.insert.map((o) => o.test_name), ["a", "b"]);
  assert.deepEqual(plan.update, []);
  assert.deepEqual(plan.remove, []);
}

// Already recommended: no duplicate insert; a changed reason is updated.
{
  const plan = planOrderSync(
    [have("1", "a", "recommended", "old")],
    [want("a", 3, "new")],
    { removeStale: false },
  );
  assert.deepEqual(plan.insert, []);
  assert.deepEqual(plan.update, [{ id: "1", trigger_reason: "new" }]);
}
{
  const plan = planOrderSync(
    [have("1", "a", "recommended", "same")],
    [want("a", 3, "same")],
    { removeStale: true },
  );
  assert.deepEqual(plan, { insert: [], update: [], remove: [] });
}

// Already ordered or later: counts as present, is never touched or re-inserted.
for (const status of ["ordered", "completed", "resulted", "cancelled"]) {
  const plan = planOrderSync(
    [have("1", "a", status, "old")],
    [want("a", 3, "new")],
    { removeStale: true },
  );
  assert.deepEqual(plan, { insert: [], update: [], remove: [] }, status);
}

// Stale recommended rows go only on a full sync.
{
  const rows = [have("1", "gone", "recommended", "r", 4)];
  assert.deepEqual(planOrderSync(rows, [], { removeStale: false }).remove, []);
  assert.deepEqual(planOrderSync(rows, [], { removeStale: true }).remove, ["1"]);
}

// A progressed row is never removed, wanted or not.
{
  const plan = planOrderSync(
    [have("1", "gone", "ordered", "r", 4), have("2", "gone2", "completed", "r", 4)],
    [],
    { removeStale: true },
  );
  assert.deepEqual(plan.remove, []);
}

// Duplicates among the wanted are inserted once.
{
  const plan = planOrderSync([], [want("a"), want("a")], { removeStale: false });
  assert.equal(plan.insert.length, 1);
}

// Duplicate recommended rows for one test: keep the first, drop extras on a full sync.
{
  const rows = [have("1", "a", "recommended"), have("2", "a", "recommended")];
  assert.deepEqual(planOrderSync(rows, [want("a")], { removeStale: true }).remove, ["2"]);
  assert.deepEqual(planOrderSync(rows, [want("a")], { removeStale: false }).remove, []);
}

// An ordered row plus a leftover recommended duplicate: the duplicate is stale.
{
  const rows = [have("1", "a", "ordered"), have("2", "a", "recommended")];
  const plan = planOrderSync(rows, [want("a")], { removeStale: true });
  assert.deepEqual(plan.remove, ["2"]);
  assert.deepEqual(plan.insert, []);
}

// Scoped to some tiers: rows and wishes outside them are invisible, so one
// part of the pathway can re-sync itself without deleting another's rows.
{
  const rows = [
    have("1", "brca", "recommended", "r", 1),
    have("2", "stool", "recommended", "r", 4),
  ];
  // A Tier 3/4 sync that wants nothing must not remove the Tier 1 row.
  const plan = planOrderSync(rows, [], { removeStale: true, tiers: [3, 4] });
  assert.deepEqual(plan.remove, ["2"]);
  // A Tier 1 sync removes only Tier 1 rows.
  assert.deepEqual(planOrderSync(rows, [], { removeStale: true, tiers: [1] }).remove, ["1"]);
  // Wishes outside the scope are ignored rather than inserted.
  const wishes = [want("brca", 3), want("x", 4)];
  assert.deepEqual(
    planOrderSync([], wishes, { removeStale: false, tiers: [4] }).insert.map((o) => o.test_name),
    ["x"],
  );
  // No scope means every tier, as before.
  assert.deepEqual(planOrderSync(rows, [], { removeStale: true }).remove, ["1", "2"]);
}

console.log("test-order-sync.test.ts OK");
