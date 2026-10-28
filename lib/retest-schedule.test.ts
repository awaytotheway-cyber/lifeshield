/**
 * Marker-specific retests.
 *
 *   npm run test:retest-schedule
 *
 * The protocol re-checks the markers that were abnormal, at an interval set at
 * review. The old behaviour put a flat 14-day reminder on every recommended
 * test, including tests the patient had not taken yet and markers that came
 * back normal. Now: only a marker whose LATEST result is abnormal gets a
 * retest; a clinician's interval wins over the default; a retest the clinician
 * has already put in the list is left alone.
 */
import assert from "node:assert/strict";
import { planRetests, type ResultForRetest } from "./retest-schedule";

const TODAY = "2026-10-27";
const row = (
  test_name: string,
  flag: string | null,
  created_at: string,
  plain_name: string | null = null,
): ResultForRetest => ({ test_name, flag, created_at, plain_name });

const opts = { defaultDays: 14, today: TODAY, existing: [] as { title: string; created_at: string }[] };

// Abnormal flags retest; normal, negative and unflagged do not.
for (const flag of ["low", "high", "critical", "positive"]) {
  const plan = planRetests([row("TSH", flag, "2026-10-27T09:00:00Z", "Thyroid")], opts);
  assert.equal(plan.length, 1, flag);
}
for (const flag of ["normal", "negative", null, "weird"]) {
  assert.deepEqual(
    planRetests([row("TSH", flag, "2026-10-27T09:00:00Z")], opts),
    [],
    String(flag),
  );
}

// Only the latest result for a marker counts, in either input order.
{
  const older = row("TSH", "high", "2026-09-01T09:00:00Z");
  const newer = row("TSH", "normal", "2026-10-01T09:00:00Z");
  assert.deepEqual(planRetests([older, newer], opts), []);
  assert.deepEqual(planRetests([newer, older], opts), []);
  const worse = row("TSH", "high", "2026-10-20T09:00:00Z");
  assert.equal(planRetests([newer, worse], opts).length, 1);
}

// Marker names match regardless of case and spacing.
assert.deepEqual(
  planRetests(
    [row(" tsh ", "high", "2026-09-01T09:00:00Z"), row("TSH", "normal", "2026-10-01T09:00:00Z")],
    opts,
  ),
  [],
);

// Due date: result date + interval, never in the past.
{
  const fresh = planRetests([row("TSH", "high", "2026-10-27T09:00:00Z")], opts)[0];
  assert.equal(fresh.dueDate, "2026-11-10");
  assert.equal(fresh.source, "default");
  const old = planRetests([row("TSH", "high", "2026-06-01T09:00:00Z")], opts)[0];
  assert.equal(old.dueDate, TODAY, "an old result is due now, not in the past");
}

// A clinician's interval for that marker wins over the default.
{
  const plan = planRetests([row("TSH", "high", "2026-10-27T09:00:00Z", "Thyroid")], {
    ...opts,
    intervalDaysByMarker: { tsh: 42 },
  })[0];
  assert.equal(plan.dueDate, "2026-12-08");
  assert.equal(plan.source, "clinician");
}

// A retest already in the list (pending or not) is not duplicated.
{
  const results = [row("TSH", "high", "2026-10-27T09:00:00Z", "Thyroid")];
  const first = planRetests(results, opts)[0];
  assert.deepEqual(
    planRetests(results, {
      ...opts,
      existing: [{ title: ` ${first.title.toUpperCase()} `, created_at: "2026-10-28T00:00:00Z" }],
    }),
    [],
  );
  // A retest from before this result does not cover it: the marker is still
  // abnormal after the earlier retest, so it needs another.
  assert.equal(
    planRetests(results, {
      ...opts,
      existing: [{ title: first.title, created_at: "2026-09-01T00:00:00Z" }],
    }).length,
    1,
  );
}

// Structured findings use the dictionary's plain name.
{
  const plan = planRetests([row("stoolDysbiosis", "positive", "2026-10-27T09:00:00Z")], opts)[0];
  assert.match(plan.title, /^Re-test: /);
  assert.notEqual(plan.title, "Re-test: stoolDysbiosis");
}

// Most serious first, capped.
{
  const results = [
    row("A", "low", "2026-10-27T09:00:00Z", "A"),
    row("B", "critical", "2026-10-27T09:00:00Z", "B"),
    row("C", "high", "2026-10-27T09:00:00Z", "C"),
    row("D", "positive", "2026-10-27T09:00:00Z", "D"),
  ];
  assert.deepEqual(
    planRetests(results, opts).map((p) => p.markerKey),
    ["b", "d", "c", "a"],
  );
  assert.equal(planRetests(results, { ...opts, max: 2 }).length, 2);
}

console.log("retest-schedule.test.ts OK");
