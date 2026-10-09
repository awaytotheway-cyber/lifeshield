import assert from "node:assert/strict";

import { firstNameFrom, greetingFor, greetingSlot } from "./greeting";

function at(hour: number): Date {
  const d = new Date(2026, 0, 15, hour, 30, 0);
  return d;
}

// Slot boundaries
assert.equal(greetingSlot(at(0)), "morning");
assert.equal(greetingSlot(at(11)), "morning");
assert.equal(greetingSlot(at(12)), "afternoon");
assert.equal(greetingSlot(at(16)), "afternoon");
assert.equal(greetingSlot(at(17)), "evening");
assert.equal(greetingSlot(at(23)), "evening");

// First name extraction
assert.equal(firstNameFrom("Pratik Sharma"), "Pratik");
assert.equal(firstNameFrom("  Pratik  "), "Pratik");
assert.equal(firstNameFrom("Pratik"), "Pratik");
assert.equal(firstNameFrom(""), null);
assert.equal(firstNameFrom("   "), null);
assert.equal(firstNameFrom(null), null);
assert.equal(firstNameFrom(undefined), null);
assert.equal(firstNameFrom(42), null);

// Full greeting
assert.equal(greetingFor("Pratik Sharma", at(9)), "Good morning, Pratik");
assert.equal(greetingFor("Pratik Sharma", at(14)), "Good afternoon, Pratik");
assert.equal(greetingFor("Pratik Sharma", at(20)), "Good evening, Pratik");
assert.equal(greetingFor(null, at(9)), "Good morning");
assert.equal(greetingFor("   ", at(20)), "Good evening");

console.log("greeting.test.ts passed");
