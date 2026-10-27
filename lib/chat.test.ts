/**
 * Unit checks for lib/chat — the pure half.
 *
 *   npx --yes tsx --tsconfig tsconfig.json lib/chat.test.ts
 *
 * The Supabase wrappers in the same module are deliberately not exercised
 * here: they reach the network. They load the client through a dynamic
 * import so that importing this module never pulls react-native into node.
 *
 * Every timestamp below is built from LOCAL date parts and then serialised,
 * so these assertions mean the same thing in every timezone. Writing the
 * fixtures as literal "...Z" strings would make the day-grouping checks pass
 * in Asia/Kolkata and fail in Pacific/Honolulu.
 */
import assert from "node:assert/strict";
import {
  groupByDay,
  isMine,
  unreadSince,
  validateMessage,
  type ChatMessage,
} from "./chat";

// ---------- validateMessage ----------

assert.deepEqual(validateMessage("  hi  "), { ok: true, body: "hi" });
assert.deepEqual(validateMessage("hi"), { ok: true, body: "hi" });

// Empty and whitespace-only are both "empty" — a message of spaces is not a
// message, and trimming has to happen before the length test or " x " would
// be measured as three characters.
assert.deepEqual(validateMessage(""), { ok: false, reason: "empty" });
assert.deepEqual(validateMessage("   "), { ok: false, reason: "empty" });
assert.deepEqual(validateMessage("   \n\t "), { ok: false, reason: "empty" });

// The 2000-character boundary, from both sides.
assert.deepEqual(validateMessage("x".repeat(2000)), {
  ok: true,
  body: "x".repeat(2000),
});
assert.deepEqual(validateMessage("x".repeat(2001)), {
  ok: false,
  reason: "too_long",
});

// The cap is measured AFTER trimming, so surrounding whitespace cannot push a
// legal message over the limit.
assert.deepEqual(validateMessage(`  ${"x".repeat(2000)}  `), {
  ok: true,
  body: "x".repeat(2000),
});

// A non-string from untyped JS must not throw.
assert.deepEqual(
  validateMessage(null as unknown as string),
  { ok: false, reason: "empty" },
);
assert.deepEqual(
  validateMessage(undefined as unknown as string),
  { ok: false, reason: "empty" },
);

// ---------- fixtures ----------

/** 20 October 2026, local noon. Pinned so these checks never expire. */
const NOW = new Date(2026, 9, 20, 12, 0, 0, 0);

/** An ISO timestamp at local `hour` on the day `daysAgo` before NOW. */
function at(daysAgo: number, hour = 9): string {
  return new Date(2026, 9, 20 - daysAgo, hour, 0, 0, 0).toISOString();
}

function msg(
  id: string,
  createdAt: string,
  senderId = "them",
): ChatMessage {
  return {
    id,
    connection_id: "c1",
    sender_id: senderId,
    body: `body ${id}`,
    created_at: createdAt,
  };
}

// ---------- groupByDay ----------

// Two days, oldest bucket first.
{
  const days = groupByDay([msg("1", at(1)), msg("2", at(0))], NOW);
  assert.equal(days.length, 2);
  assert.equal(days[0].label, "Yesterday");
  assert.equal(days[1].label, "Today");
  assert.deepEqual(
    days.map((d) => d.messages.map((m) => m.id)),
    [["1"], ["2"]],
  );
  // The key is the local calendar day, not an instant.
  assert.equal(days[0].day, "2026-10-19");
  assert.equal(days[1].day, "2026-10-20");
}

// Input order must not matter — the output is always oldest first.
{
  const days = groupByDay([msg("2", at(0)), msg("1", at(1))], NOW);
  assert.deepEqual(days.map((d) => d.day), ["2026-10-19", "2026-10-20"]);
}

// Anything older than yesterday gets an absolute date. "12 October", not
// "October 12" — the label is composed, not locale-formatted, so the design
// spec holds on every device.
{
  const days = groupByDay([msg("3", at(8))], NOW);
  assert.equal(days.length, 1);
  assert.equal(days[0].day, "2026-10-12");
  assert.equal(days[0].label, "12 October");
}

// A thread that spans a year boundary says which year, so "12 October" can
// never mean two different days in the same list.
{
  const lastYear = new Date(2025, 9, 12, 9, 0, 0, 0).toISOString();
  const days = groupByDay([msg("4", lastYear), msg("5", at(0))], NOW);
  assert.equal(days.length, 2);
  assert.equal(days[0].label, "12 October 2025");
  assert.equal(days[1].label, "Today");
}

// Several messages on one day stay in one bucket, in time order.
{
  const days = groupByDay(
    [msg("late", at(0, 18)), msg("early", at(0, 7)), msg("mid", at(0, 12))],
    NOW,
  );
  assert.equal(days.length, 1);
  assert.deepEqual(days[0].messages.map((m) => m.id), [
    "early",
    "mid",
    "late",
  ]);
}

// Two messages minutes apart but either side of local midnight are two days.
{
  const beforeMidnight = new Date(2026, 9, 19, 23, 50, 0, 0).toISOString();
  const afterMidnight = new Date(2026, 9, 20, 0, 10, 0, 0).toISOString();
  const days = groupByDay(
    [msg("a", beforeMidnight), msg("b", afterMidnight)],
    NOW,
  );
  assert.equal(days.length, 2);
  assert.deepEqual(days.map((d) => d.label), ["Yesterday", "Today"]);
}

// Empty in, empty out. No "Today" bucket is invented.
assert.deepEqual(groupByDay([], NOW), []);

// A message with an unreadable timestamp is dropped rather than crashing the
// thread or landing in a bucket labelled "Invalid Date".
{
  const days = groupByDay([msg("bad", "not a date"), msg("ok", at(0))], NOW);
  assert.equal(days.length, 1);
  assert.deepEqual(days[0].messages.map((m) => m.id), ["ok"]);
}

// `now` defaults to the real clock: a message stamped right now is "Today".
{
  const days = groupByDay([msg("now", new Date().toISOString())]);
  assert.equal(days.length, 1);
  assert.equal(days[0].label, "Today");
}

// ---------- isMine ----------

assert.equal(isMine(msg("1", at(0), "me"), "me"), true);
assert.equal(isMine(msg("1", at(0), "them"), "me"), false);
// A missing id is nobody, so nothing is mine — a blank id must never make the
// whole thread render as sent-by-me.
assert.equal(isMine(msg("1", at(0), "me"), ""), false);
assert.equal(isMine(msg("1", at(0), ""), ""), false);
assert.equal(isMine(msg("1", at(0), "me"), null as unknown as string), false);

// ---------- unreadSince ----------
//
// chat_messages has no read_at column, so there is no server-side notion of
// "read". This counts the other party's messages newer than a last-seen
// timestamp the UI holds locally. It is a local convenience, not a fact about
// the database.

{
  const msgs = [
    msg("1", at(2), "them"),
    msg("2", at(1), "them"),
    msg("3", at(0), "me"),
    msg("4", at(0, 10), "them"),
  ];

  // Seen as of two days ago: the later two of theirs count, mine never do.
  assert.equal(unreadSince(msgs, "me", at(2)), 2);

  // Seen just now: nothing is unread.
  assert.equal(unreadSince(msgs, "me", at(0, 23)), 0);

  // Never seen: every message of theirs is unread.
  assert.equal(unreadSince(msgs, "me", null), 3);
  assert.equal(unreadSince(msgs, "me", ""), 3);

  // The boundary is exclusive — a message stamped exactly at last-seen has
  // been seen, so an idle screen cannot re-count its own last render.
  assert.equal(unreadSince([msg("1", at(1), "them")], "me", at(1)), 0);

  // My own messages are never unread, whatever the cutoff.
  assert.equal(unreadSince([msg("1", at(0), "me")], "me", null), 0);

  // An unreadable last-seen value is treated as never-seen, not as "all read".
  assert.equal(unreadSince(msgs, "me", "nonsense"), 3);

  // An unreadable message timestamp cannot be placed, so it is not counted.
  assert.equal(unreadSince([msg("1", "nonsense", "them")], "me", null), 0);

  // No signed-in id: counting is meaningless, so it is zero rather than
  // "everything", which would badge a signed-out screen.
  assert.equal(unreadSince(msgs, "", null), 0);
}

assert.equal(unreadSince([], "me", null), 0);

// ---------- the structural promise ----------
//
// "Results and reports are never shared in chat" has to be true of the shape
// of this module, not just of the copy. A ChatMessage carries a body and
// nothing else: no result id, no order id, no attachment, no medication.
{
  const keys = Object.keys(msg("1", at(0))).sort();
  assert.deepEqual(keys, [
    "body",
    "connection_id",
    "created_at",
    "id",
    "sender_id",
  ]);
}

console.log("chat ok");
