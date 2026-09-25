/**
 *   npx --yes tsx --tsconfig tsconfig.json lib/activity.test.ts
 */
import assert from "node:assert/strict";
import {
  ALL_KINDS,
  bucketDaily,
  CANONICAL_UNIT,
  formatValue,
  isAdditive,
  normaliseIncoming,
  targetDirection,
  targetPercent,
  validateManualDraft,
  type ActivitySnapshot,
} from "./activity";

// ---------- Constants ----------

assert.deepEqual(ALL_KINDS, [
  "steps",
  "active_minutes",
  "resting_heart_rate",
  "sleep_minutes",
  "weight_kg",
]);
assert.equal(CANONICAL_UNIT.steps, "steps");
assert.equal(CANONICAL_UNIT.resting_heart_rate, "bpm");

// ---------- targetDirection / isAdditive ----------

assert.equal(targetDirection("steps"), "higher_better");
assert.equal(targetDirection("resting_heart_rate"), "lower_better");
assert.equal(isAdditive("steps"), true);
assert.equal(isAdditive("resting_heart_rate"), false);
assert.equal(isAdditive("weight_kg"), false);

// ---------- validateManualDraft ----------

// Happy path with string value.
{
  const out = validateManualDraft({ kind: "steps", value: "6500" });
  assert.equal(out.ok, true);
  if (!out.ok) throw new Error("expected ok");
  assert.equal(out.value, 6500);
  assert.equal(out.recorded_at.endsWith("T00:00:00Z"), true);
}

// Negative rejected.
{
  const out = validateManualDraft({ kind: "steps", value: -1 });
  assert.equal(out.ok, false);
  if (out.ok) throw new Error("expected err");
  assert.equal(out.errors[0].field, "value");
}

// Range violations rejected.
{
  const out = validateManualDraft({ kind: "steps", value: 200_000 });
  assert.equal(out.ok, false);
}
{
  const out = validateManualDraft({ kind: "resting_heart_rate", value: 10 });
  assert.equal(out.ok, false);
}

// Bad date shape rejected.
{
  const out = validateManualDraft({
    kind: "steps",
    value: 5000,
    recorded_at: "2026/09/25",
  });
  assert.equal(out.ok, false);
}

// Bad kind rejected.
{
  const out = validateManualDraft({ kind: "bogus" as never, value: 1 });
  assert.equal(out.ok, false);
}

// ---------- normaliseIncoming ----------

assert.deepEqual(normaliseIncoming("steps", 1234, "steps"), {
  value: 1234,
  unit: "steps",
});
// weight lb → kg
{
  const out = normaliseIncoming("weight_kg", 154, "lb");
  assert.ok(Math.abs(out.value - 69.85) < 0.02);
  assert.equal(out.unit, "kg");
}
// active minutes hours → minutes
{
  const out = normaliseIncoming("active_minutes", 1.5, "hours");
  assert.equal(out.value, 90);
  assert.equal(out.unit, "minutes");
}
// resting heart rate: unknown unit passes through so bad ingest is visible.
{
  const out = normaliseIncoming("resting_heart_rate", 60, "");
  assert.equal(out.unit, "bpm");
}
// Empty unit falls back to canonical.
{
  const out = normaliseIncoming("sleep_minutes", 420, "");
  assert.equal(out.unit, "minutes");
}

// ---------- bucketDaily ----------

function snap(
  overrides: Partial<ActivitySnapshot> & {
    kind: ActivitySnapshot["kind"];
    value: number;
    recorded_at: string;
  },
): ActivitySnapshot {
  return {
    id: overrides.id ?? `id-${Math.random()}`,
    user_id: overrides.user_id ?? "u1",
    source: overrides.source ?? "manual",
    kind: overrides.kind,
    value: overrides.value,
    unit: overrides.unit ?? CANONICAL_UNIT[overrides.kind],
    value_json: overrides.value_json ?? {},
    recorded_at: overrides.recorded_at,
    created_at: overrides.created_at ?? overrides.recorded_at,
  };
}

// Steps sum across sources for the same day.
{
  const buckets = bucketDaily([
    snap({ kind: "steps", value: 3000, recorded_at: "2026-09-25T09:00:00Z", source: "manual" }),
    snap({ kind: "steps", value: 4500, recorded_at: "2026-09-25T18:00:00Z", source: "healthkit" }),
    snap({ kind: "steps", value: 5000, recorded_at: "2026-09-24T18:00:00Z" }),
  ]);
  // Newest-day first.
  assert.equal(buckets[0].date, "2026-09-25");
  assert.equal(buckets[0].total, 7500);
  assert.equal(buckets[0].count, 2);
  assert.deepEqual(buckets[0].sources.sort(), ["healthkit", "manual"]);
  assert.equal(buckets[1].date, "2026-09-24");
  assert.equal(buckets[1].total, 5000);
}

// Point-in-time (heart rate) doesn't sum.
{
  const buckets = bucketDaily([
    snap({ kind: "resting_heart_rate", value: 64, recorded_at: "2026-09-25T08:00:00Z" }),
    snap({ kind: "resting_heart_rate", value: 61, recorded_at: "2026-09-25T22:00:00Z" }),
  ]);
  assert.equal(buckets.length, 1);
  // "Latest of the day" — both share date so either wins depending on
  // iteration order; we only guarantee count is 2 and total is one of
  // the source values.
  assert.equal(buckets[0].count, 2);
  assert.ok([64, 61].includes(buckets[0].total));
}

// Malformed recorded_at is skipped, not thrown.
{
  const buckets = bucketDaily([
    snap({ kind: "steps", value: 100, recorded_at: "not-a-date" }),
    snap({ kind: "steps", value: 200, recorded_at: "2026-09-25T00:00:00Z" }),
  ]);
  assert.equal(buckets.length, 1);
  assert.equal(buckets[0].total, 200);
}

// Empty input.
assert.deepEqual(bucketDaily([]), []);

// ---------- targetPercent ----------

// Higher-better: linear ramp to 100.
assert.equal(targetPercent("steps", 4000, 8000), 50);
assert.equal(targetPercent("steps", 10000, 8000), 100); // clamped
assert.equal(targetPercent("steps", 0, 8000), 0);

// Lower-better: 100 at-or-below target, decays to 0 at 1.5×.
assert.equal(targetPercent("resting_heart_rate", 60, 65), 100);
assert.equal(targetPercent("resting_heart_rate", 65, 65), 100);
// Halfway between target (65) and ceiling (97.5) is ~81 → percent ~50
{
  const halfway = 65 + (97.5 - 65) / 2;
  const pct = targetPercent("resting_heart_rate", halfway, 65);
  assert.ok(pct >= 45 && pct <= 55, `expected ~50, got ${pct}`);
}
assert.equal(targetPercent("resting_heart_rate", 100, 65), 0);

// Zero target returns 0 (weight_kg default) rather than dividing.
assert.equal(targetPercent("weight_kg", 80), 0);

// ---------- formatValue ----------

assert.equal(formatValue("steps", 12345), "12,345");
assert.equal(formatValue("resting_heart_rate", 61), "61 bpm");
assert.equal(formatValue("sleep_minutes", 420), "7h");
assert.equal(formatValue("sleep_minutes", 455), "7h 35m");
assert.equal(formatValue("active_minutes", 42), "42 min");
assert.equal(formatValue("weight_kg", 72.34), "72.3 kg");
assert.equal(formatValue("steps", NaN), "—");

// eslint-disable-next-line no-console
console.log("activity.test.ts OK");
