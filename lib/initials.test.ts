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

// Uppercasing never widens a letter into two glyphs: "ß" uppercases to "SS",
// but a disc has room for one glyph per word.
assert.equal(initialsFor("ßeta Ray"), "SR");
assert.equal(Array.from(initialsFor("ßeta ßray")).length, 2);

// Whatever the name, the result is never more than two glyphs wide.
for (const name of [
  "Anjali Mehta",
  "Anjali Devi Mehta",
  "ßeta ßray",
  "Ωmega Ray",
  "𝒜lpha Beta",
  "",
  "   ",
]) {
  assert.ok(
    Array.from(initialsFor(name)).length <= 2,
    `initialsFor(${JSON.stringify(name)}) is wider than two glyphs`,
  );
}

// eslint-disable-next-line no-console
console.log("initials.test.ts OK");
