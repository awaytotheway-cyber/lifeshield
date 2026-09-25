/**
 * Unit checks for lib/goals.
 *
 *   npx --yes tsx --tsconfig tsconfig.json lib/goals.test.ts
 */
import assert from "node:assert/strict";
import {
  computeDailyStreak,
  computeProgress,
  todayYmd,
  validateGoalDraft,
  type Goal,
  type GoalProgressEntry,
} from "./goals";

// ---------- validateGoalDraft ----------

const validDraft = {
  goal_type: "steps",
  title: "Walk 10k steps",
  target: { value: 10000, unit: "steps", cadence: "daily" as const },
  start_date: "2026-09-25",
  end_date: null,
};

assert.deepEqual(validateGoalDraft(validDraft), []);

// Missing / blank goal_type
{
  const errs = validateGoalDraft({ ...validDraft, goal_type: " " });
  assert.equal(errs.some((e) => e.field === "goal_type"), true);
}
// Missing title
{
  const errs = validateGoalDraft({ ...validDraft, title: "" });
  assert.equal(errs.some((e) => e.field === "title"), true);
}
// Non-positive target value
{
  const errs = validateGoalDraft({
    ...validDraft,
    target: { ...validDraft.target, value: 0 },
  });
  assert.equal(errs.some((e) => e.field === "target.value"), true);
}
// Missing unit
{
  const errs = validateGoalDraft({
    ...validDraft,
    target: { ...validDraft.target, unit: "" },
  });
  assert.equal(errs.some((e) => e.field === "target.unit"), true);
}
// Bad cadence
{
  const errs = validateGoalDraft({
    ...validDraft,
    target: {
      ...validDraft.target,
      cadence: "yearly" as unknown as "daily",
    },
  });
  assert.equal(errs.some((e) => e.field === "target.cadence"), true);
}
// Malformed start_date
{
  const errs = validateGoalDraft({ ...validDraft, start_date: "25/09/2026" });
  assert.equal(errs.some((e) => e.field === "start_date"), true);
}
// end_date before start_date
{
  const errs = validateGoalDraft({
    ...validDraft,
    start_date: "2026-09-25",
    end_date: "2026-09-24",
  });
  assert.equal(errs.some((e) => e.field === "end_date"), true);
}
// end_date matches format and >= start_date is fine
{
  const errs = validateGoalDraft({
    ...validDraft,
    start_date: "2026-09-25",
    end_date: "2026-10-25",
  });
  assert.deepEqual(errs, []);
}

// ---------- computeProgress ----------

const dailyGoal: Pick<Goal, "target"> = {
  target: { value: 10000, unit: "steps", cadence: "daily" },
};
const now = new Date("2026-09-25T12:00:00Z");
const todayEntry = (value: number, hourUtc = 8): GoalProgressEntry => ({
  id: "e",
  goal_id: "g",
  user_id: "u",
  recorded_at: `2026-09-25T${String(hourUtc).padStart(2, "0")}:00:00Z`,
  value,
  note: null,
});

{
  const p = computeProgress(dailyGoal, [todayEntry(4000), todayEntry(3000, 15)], now);
  assert.equal(p.total, 7000);
  assert.equal(p.remaining, 3000);
  assert.equal(p.percent, 70);
}

// Yesterday's entry doesn't count for a daily goal.
{
  const yesterday: GoalProgressEntry = {
    ...todayEntry(9000),
    recorded_at: "2026-09-24T22:00:00Z",
  };
  const p = computeProgress(dailyGoal, [yesterday], now);
  assert.equal(p.total, 0);
  assert.equal(p.percent, 0);
}

// Percent is clamped to 100 when the user overshoots.
{
  const p = computeProgress(dailyGoal, [todayEntry(50000)], now);
  assert.equal(p.percent, 100);
  assert.equal(p.remaining, 0);
}

// Weekly goal counts entries within a rolling 7-day window.
const weeklyGoal: Pick<Goal, "target"> = {
  target: { value: 150, unit: "minutes", cadence: "weekly" },
};
{
  const entries: GoalProgressEntry[] = [
    { ...todayEntry(30), recorded_at: "2026-09-20T09:00:00Z" }, // within 7d
    { ...todayEntry(30), recorded_at: "2026-09-24T09:00:00Z" }, // within 7d
    { ...todayEntry(60), recorded_at: "2026-09-10T09:00:00Z" }, // > 7d ago
  ];
  const p = computeProgress(weeklyGoal, entries, now);
  assert.equal(p.total, 60);
  assert.equal(p.remaining, 90);
}

// Once goal sums everything.
const onceGoal: Pick<Goal, "target"> = {
  target: { value: 100, unit: "pages", cadence: "once" },
};
{
  const entries: GoalProgressEntry[] = [
    { ...todayEntry(25), recorded_at: "2025-01-01T09:00:00Z" },
    { ...todayEntry(25), recorded_at: "2026-06-01T09:00:00Z" },
    { ...todayEntry(25), recorded_at: "2026-09-25T09:00:00Z" },
  ];
  const p = computeProgress(onceGoal, entries, now);
  assert.equal(p.total, 75);
  assert.equal(p.percent, 75);
}

// ---------- computeDailyStreak ----------

// 3-day streak: entries for today, yesterday, day before, each meeting target.
{
  const entries: GoalProgressEntry[] = [
    { ...todayEntry(10000), recorded_at: "2026-09-25T09:00:00Z" },
    { ...todayEntry(10000), recorded_at: "2026-09-24T09:00:00Z" },
    { ...todayEntry(10000), recorded_at: "2026-09-23T09:00:00Z" },
    // gap on 09-22 breaks the streak; entries before are irrelevant.
    { ...todayEntry(10000), recorded_at: "2026-09-21T09:00:00Z" },
  ];
  const streak = computeDailyStreak(
    dailyGoal,
    entries,
    new Date("2026-09-25T20:00:00Z"),
  );
  assert.equal(streak, 3);
}

// Multiple entries on one day sum toward the daily target.
{
  const entries: GoalProgressEntry[] = [
    { ...todayEntry(6000, 8), recorded_at: "2026-09-25T08:00:00Z" },
    { ...todayEntry(5000, 18), recorded_at: "2026-09-25T18:00:00Z" },
  ];
  const streak = computeDailyStreak(
    dailyGoal,
    entries,
    new Date("2026-09-25T20:00:00Z"),
  );
  assert.equal(streak, 1);
}

// Falling short today keeps the streak at 0.
{
  const entries: GoalProgressEntry[] = [
    { ...todayEntry(2000), recorded_at: "2026-09-25T09:00:00Z" },
  ];
  const streak = computeDailyStreak(
    dailyGoal,
    entries,
    new Date("2026-09-25T20:00:00Z"),
  );
  assert.equal(streak, 0);
}

// Weekly / once cadence: streak is not meaningful, return 0.
assert.equal(computeDailyStreak(weeklyGoal, [], now), 0);
assert.equal(computeDailyStreak(onceGoal, [], now), 0);

// ---------- todayYmd ----------
assert.equal(todayYmd(new Date("2026-09-25T12:00:00Z")), (() => {
  // Local-time based; compute expected using the same math the impl uses.
  const d = new Date("2026-09-25T12:00:00Z");
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
})());

// eslint-disable-next-line no-console
console.log("goals.test.ts OK");
