/**
 * Unit checks for lib/buddies — the pure half.
 *
 *   npx --yes tsx --tsconfig tsconfig.json lib/buddies.test.ts
 *
 * The Supabase wrappers in the same module are deliberately not exercised
 * here: they reach the network. They load the client through a dynamic
 * import so that importing this module never pulls react-native into node.
 */
import assert from "node:assert/strict";
import {
  canMessage,
  connectionRole,
  connectionStatusFor,
  describeBuddy,
  displayNameFrom,
  type BuddyMatch,
  type Connection,
} from "./buddies";

// ---------- displayNameFrom ----------
// Mirrors the SQL in discover_potential_buddies():
//   coalesce(nullif(buddy_display_name, ''),
//            nullif(split_part(full_name, ' ', 1), ''),
//            'Buddy')

// buddy_display_name wins when it has content.
assert.equal(displayNameFrom("Anji", "Anjali Mehta"), "Anji");
// Blank buddy_display_name falls through to the first word of full_name.
assert.equal(displayNameFrom("", "Anjali Mehta"), "Anjali");
assert.equal(displayNameFrom("   ", "Anjali Mehta"), "Anjali");
assert.equal(displayNameFrom(null, "Anjali Mehta"), "Anjali");
// A single-word full_name is its own first word.
assert.equal(displayNameFrom(null, "Priya"), "Priya");
// Leading whitespace must not yield an empty first word.
assert.equal(displayNameFrom(null, "  Priya Shah "), "Priya");
// Both blank -> the fallback. Never "".
assert.equal(displayNameFrom(null, null), "Buddy");
assert.equal(displayNameFrom("", ""), "Buddy");
assert.equal(displayNameFrom("   ", "   "), "Buddy");
// Never an empty string, whatever goes in.
for (const [a, b] of [
  [null, null],
  ["", ""],
  [" ", " "],
  [null, "  "],
  ["", null],
] as [string | null, string | null][]) {
  assert.notEqual(displayNameFrom(a, b), "");
}
// A surname is never exposed.
assert.equal(displayNameFrom(null, "Anjali Mehta").includes("Mehta"), false);

// ---------- describeBuddy ----------

function match(over: Partial<BuddyMatch> = {}): BuddyMatch {
  return {
    user_id: "u1",
    display_name: "Anjali",
    city: null,
    interests: [],
    shared_interests: [],
    match_score: 0,
    ...over,
  };
}

assert.equal(
  describeBuddy(match({ city: "Mumbai", interests: ["walking", "40s"] })),
  "Mumbai · walking, 40s",
);
// City only — no trailing separator.
assert.equal(describeBuddy(match({ city: "Thane" })), "Thane");
// Interests only — no leading separator.
assert.equal(
  describeBuddy(match({ interests: ["walking"] })),
  "walking",
);
// Neither — the empty string, so a caller can skip the line entirely.
assert.equal(describeBuddy(match()), "");
// Blank strings count as absent on both sides.
assert.equal(describeBuddy(match({ city: "   ", interests: [] })), "");
assert.equal(
  describeBuddy(match({ city: "  ", interests: ["  ", "yoga", ""] })),
  "yoga",
);
// Null-ish interests from a row that came back without the column.
assert.equal(
  describeBuddy(match({ city: "Pune", interests: null as unknown as string[] })),
  "Pune",
);
// No stray separator anywhere.
for (const text of [
  describeBuddy(match({ city: "Thane" })),
  describeBuddy(match({ interests: ["walking"] })),
  describeBuddy(match({ city: "Mumbai", interests: ["walking"] })),
]) {
  assert.equal(text.startsWith("·"), false);
  assert.equal(text.endsWith("·"), false);
  assert.equal(text.includes("· ·"), false);
  assert.equal(text.trim(), text);
}

// ---------- connectionRole / connectionStatusFor / canMessage ----------

const ME = "me-uuid";
const THEM = "them-uuid";

function connection(over: Partial<Connection> = {}): Connection {
  return {
    id: "c1",
    requester_id: ME,
    addressee_id: THEM,
    status: "requested",
    request_note: null,
    created_at: "2026-10-27T00:00:00Z",
    updated_at: "2026-10-27T00:00:00Z",
    ...over,
  };
}

// Roles.
assert.equal(connectionRole(connection(), ME), "requester");
assert.equal(connectionRole(connection(), THEM), "addressee");
assert.equal(connectionRole(connection(), "someone-else"), "none");

// All four statuses, from both sides.
// I sent it -> outgoing.
assert.equal(
  connectionStatusFor(
    connection({ requester_id: ME, addressee_id: THEM, status: "requested" }),
    ME,
  ),
  "outgoing_request",
);
// They sent it -> incoming, so the UI offers Accept.
assert.equal(
  connectionStatusFor(
    connection({ requester_id: THEM, addressee_id: ME, status: "requested" }),
    ME,
  ),
  "incoming_request",
);
// Active reads the same from either side.
assert.equal(
  connectionStatusFor(
    connection({ requester_id: ME, addressee_id: THEM, status: "active" }),
    ME,
  ),
  "active",
);
assert.equal(
  connectionStatusFor(
    connection({ requester_id: THEM, addressee_id: ME, status: "active" }),
    ME,
  ),
  "active",
);
// A connection between two other people tells me nothing.
assert.equal(
  connectionStatusFor(
    connection({ requester_id: "a", addressee_id: "b", status: "active" }),
    ME,
  ),
  "none",
);
assert.equal(
  connectionStatusFor(
    connection({ requester_id: "a", addressee_id: "b", status: "requested" }),
    ME,
  ),
  "none",
);
// Declined and inactive are real statuses but not actionable ones.
assert.equal(connectionStatusFor(connection({ status: "declined" }), ME), "none");
assert.equal(connectionStatusFor(connection({ status: "inactive" }), ME), "none");
// Nor is a status this client does not know about.
assert.equal(
  connectionStatusFor(
    connection({ status: "banana" as unknown as Connection["status"] }),
    ME,
  ),
  "none",
);

// canMessage — only 'active'.
assert.equal(canMessage(connection({ status: "active" })), true);
assert.equal(canMessage(connection({ status: "requested" })), false);
assert.equal(canMessage(null), false);
assert.equal(canMessage(connection({ status: "declined" })), false);
assert.equal(canMessage(connection({ status: "inactive" })), false);
assert.equal(
  canMessage(connection({ status: "banana" as unknown as Connection["status"] })),
  false,
);

console.log("buddies ok");
