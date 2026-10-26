/**
 * Unit checks for lib/design-tokens (Moss design language).
 *
 *   npx --yes tsx --tsconfig tsconfig.json lib/design-tokens.test.ts
 */
import assert from "node:assert/strict";
import {
  colors,
  radius,
  status,
  heroGradient,
  spacing,
  tapTarget,
  controlHeight,
} from "./design-tokens";

// ---------- core palette ----------

assert.equal(colors.ink, "#0C0C0A");
assert.equal(colors.paper, "#F1F1EF");
assert.equal(colors.mossDeep, "#5F6D17");
assert.equal(colors.mossTint, "#EFF2E2");
assert.equal(colors.inkSoft, "#4F4F49");
assert.equal(colors.inkFaint, "#8A8A84");
assert.equal(colors.inkMuted, "#6B6B65");
assert.equal(colors.white, "#FFFFFF");
assert.equal(colors.mossMid, "#7D9022");
assert.equal(colors.mossBright, "#A3B82E");
assert.equal(colors.hairline, "#E4E4E0");

// ---------- shape ----------

assert.deepEqual(radius, { surface: 20, control: 4, pill: 999 });

// ---------- clinical status ----------

assert.equal(status.withinRange.fill, "#EFF2E2");
assert.equal(status.withinRange.text, "#4A5612");
assert.equal(status.withinRange.label, "Within range");
assert.equal(status.worthWatching.fill, "#F0E6D2");
assert.equal(status.worthWatching.text, "#7A5610");
assert.equal(status.worthWatching.label, "Worth watching");
assert.equal(status.worthDiscussing.fill, "#F3DED4");
assert.equal(status.worthDiscussing.text, "#9C3E16");
assert.equal(status.worthDiscussing.label, "Worth discussing");

// Lightness, not hue: every status carries its own word, never colour alone.
assert.equal(Object.keys(status).length, 3);
for (const key of ["withinRange", "worthWatching", "worthDiscussing"] as const) {
  assert.equal(typeof status[key].label, "string");
  assert.notEqual(status[key].label.trim(), "");
}

// ---------- hero gradient (the only gradient allowed) ----------

assert.equal(heroGradient.angle, 155);
assert.deepEqual([...heroGradient.colors], ["#A3B82E", "#7D9022", "#4C5812"]);
assert.deepEqual([...heroGradient.locations], [0, 0.42, 1]);
assert.equal(heroGradient.colors.length, heroGradient.locations.length);

// ---------- sizing ----------

assert.equal(tapTarget, 44);
assert.equal(controlHeight, 56);
assert.equal(spacing.screenX, 24);

// ---------- nothing from the blue glass era survives ----------

for (const banned of ["primaryBlue", "iceBlue", "deepTeal", "sage", "coral", "cream", "glassFill"]) {
  assert.equal(banned in colors, false, `${banned} must be deleted, not remapped`);
}

console.log("design-tokens ok");
