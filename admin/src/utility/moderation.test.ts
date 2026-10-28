/**
 * Moderation helpers.
 *
 *   npm run test:moderation   (from the repo root)
 */
import assert from "node:assert/strict";
import {
  isReportStatus,
  mostBlocked,
  otherReportsAbout,
  personLabel,
  reportChipKind,
  sortReportsForQueue,
} from "./moderation";

// Statuses
assert.equal(isReportStatus("open"), true);
assert.equal(isReportStatus("closed"), false);
assert.equal(isReportStatus(undefined), false);
assert.equal(reportChipKind("open"), "warning");
assert.equal(reportChipKind("reviewing"), "info");
assert.equal(reportChipKind("actioned"), "success");
assert.equal(reportChipKind("dismissed"), "inactive");
assert.equal(reportChipKind("anything else"), "inactive");

// Queue order: open first, then reviewing, then settled; newest first inside each.
{
  const sorted = sortReportsForQueue([
    { id: "a", status: "dismissed", created_at: "2026-10-28T10:00:00Z" },
    { id: "b", status: "open", created_at: "2026-10-26T10:00:00Z" },
    { id: "c", status: "reviewing", created_at: "2026-10-28T09:00:00Z" },
    { id: "d", status: "open", created_at: "2026-10-27T10:00:00Z" },
    { id: "e", status: "actioned", created_at: "2026-10-29T10:00:00Z" },
  ]);
  assert.deepEqual(sorted.map((r) => r.id), ["d", "b", "c", "e", "a"]);
}
// Sorting never mutates its input.
{
  const input = [
    { id: "x", status: "dismissed", created_at: "2026-01-01" },
    { id: "y", status: "open", created_at: "2026-01-01" },
  ];
  sortReportsForQueue(input);
  assert.deepEqual(input.map((r) => r.id), ["x", "y"]);
}

// Most blocked
assert.deepEqual(mostBlocked([]), []);
assert.deepEqual(
  mostBlocked([
    { blocked_id: "b" },
    { blocked_id: "a" },
    { blocked_id: "b" },
    { blocked_id: "c" },
    { blocked_id: "a" },
    { blocked_id: "b" },
  ]),
  [
    { id: "b", count: 3 },
    { id: "a", count: 2 },
    { id: "c", count: 1 },
  ],
);
assert.equal(mostBlocked([{ blocked_id: "a" }, { blocked_id: "b" }], 1).length, 1);

// Other reports about the same target
{
  const reports = [
    { id: "1", target_id: "t" },
    { id: "2", target_id: "t" },
    { id: "3", target_id: "u" },
  ];
  assert.equal(otherReportsAbout(reports, "t", "1"), 1);
  assert.equal(otherReportsAbout(reports, "u", "3"), 0);
  assert.equal(otherReportsAbout(reports, "missing", "x"), 0);
}

// Labels show a first name and city, never a surname or email.
assert.equal(
  personLabel({ buddy_display_name: "Asha", full_name: "Asha Patil", city: "Mumbai" }, "abcdef1234"),
  "Asha · Mumbai",
);
assert.equal(personLabel({ full_name: "Asha Patil", city: null }, "abcdef1234"), "Asha");
assert.equal(personLabel({ city: "Bristol" }, "abcdef1234"), "Member abcdef12 · Bristol");
assert.equal(personLabel(undefined, "abcdef1234"), "Member abcdef12");
assert.equal(personLabel({ buddy_display_name: "  ", full_name: " ", city: " " }, "abcdef1234"), "Member abcdef12");

console.log("moderation.test.ts OK");
