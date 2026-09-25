/**
 *   npx --yes tsx --tsconfig tsconfig.json lib/intervention-progress.test.ts
 */
import assert from "node:assert/strict";
import {
  countDoneInLast7Days,
  type InterventionProgressEntry,
} from "./intervention-progress-summary";

function entry(
  isoDate: string,
  value: { done?: boolean } = {},
): InterventionProgressEntry {
  return {
    id: `e-${isoDate}`,
    intervention_id: "int",
    user_id: "u",
    recorded_at: new Date(isoDate).toISOString(),
    value,
    note: null,
  };
}

const now = new Date("2026-09-25T20:00:00Z");

// No entries → 0.
assert.equal(countDoneInLast7Days([], now), 0);

// Only 'done: true' counts; other shapes are ignored.
{
  const rows = [
    entry("2026-09-25T09:00:00Z", { done: true }),
    entry("2026-09-25T18:00:00Z", { done: true }), // same day, still 1
    entry("2026-09-24T09:00:00Z", { done: true }),
    entry("2026-09-24T18:00:00Z", {}), // no done — ignored
    entry("2026-09-23T09:00:00Z", { done: false }), // false — ignored
  ];
  assert.equal(countDoneInLast7Days(rows, now), 2);
}

// Entries older than 7 days are excluded.
{
  const rows = [
    entry("2026-09-25T09:00:00Z", { done: true }),
    entry("2026-09-10T09:00:00Z", { done: true }),
  ];
  assert.equal(countDoneInLast7Days(rows, now), 1);
}

// eslint-disable-next-line no-console
console.log("intervention-progress.test.ts OK");
