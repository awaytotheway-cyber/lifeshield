/**
 * Unit checks for lib/initials.
 *
 *   npx --yes tsx --tsconfig tsconfig.json lib/initials.test.ts
 */
import assert from "node:assert/strict";
import { initialsFor } from "./initials";

assert.equal(initialsFor("Anjali Mehta"), "AM");
assert.equal(initialsFor("Priya"), "P");            // one word -> one letter
assert.equal(initialsFor("  meera  k  "), "MK");    // trims and collapses
assert.equal(initialsFor(""), "");                  // caller renders no disc
assert.equal(initialsFor("Ωmega Ray"), "ΩR");       // non-Latin survives

// Only the first two words contribute — a third name is ignored, never a
// third letter on a two-letter disc.
assert.equal(initialsFor("Anjali Devi Mehta"), "AD");

// Whitespace of every kind collapses, including tabs and newlines.
assert.equal(initialsFor("\tmeera\nk\t"), "MK");
assert.equal(initialsFor("   "), "");

// Surrogate pairs survive: the astral character is taken whole, not split
// into a lone high surrogate.
assert.equal(initialsFor("𝒜lpha Beta"), "𝒜B");
assert.equal(Array.from(initialsFor("𝒜lpha")).length, 1);

// eslint-disable-next-line no-console
console.log("initials.test.ts OK");
