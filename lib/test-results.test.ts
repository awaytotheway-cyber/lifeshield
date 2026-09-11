/**
 * Status-chip mapping for lab flags.
 * Run: npm run test:lab-results
 */
import { COPY } from "./copy";
import { meaningForFlag, statusChipFromFlag } from "./result-status";

let passed = 0;

function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}

function equal<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

check("normal is within range", () => {
  const chip = statusChipFromFlag("normal");
  equal(chip.tone, "within_range", "tone");
  equal(chip.label, COPY.labChipWithinRange, "label");
});

check("low and high are worth watching", () => {
  equal(statusChipFromFlag("low").tone, "worth_watching", "low");
  equal(statusChipFromFlag("high").tone, "worth_watching", "high");
  equal(statusChipFromFlag("low").label, COPY.labChipWorthWatching, "label");
});

check("critical and positive need attention", () => {
  equal(statusChipFromFlag("critical").tone, "needs_attention", "critical");
  equal(statusChipFromFlag("positive").tone, "needs_attention", "positive");
});

check("negative stays calm", () => {
  const chip = statusChipFromFlag("negative");
  equal(chip.tone, "within_range", "tone");
  equal(chip.label, COPY.labChipNegative, "label");
});

check("missing flag is not scary", () => {
  equal(statusChipFromFlag(null).tone, "within_range", "null");
  equal(statusChipFromFlag(undefined).tone, "within_range", "undefined");
});

check("meaning copy never claims a diagnosis", () => {
  const texts = [
    meaningForFlag("normal"),
    meaningForFlag("low"),
    meaningForFlag("critical"),
    meaningForFlag("positive"),
    meaningForFlag("negative"),
    meaningForFlag(null),
  ];
  for (const text of texts) {
    if (!/not a diagnosis/i.test(text)) {
      throw new Error(`Missing not-a-diagnosis line: ${text}`);
    }
  }
});

console.log(`\n${passed} checks passed`);
