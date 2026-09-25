/**
 *   npx --yes tsx --tsconfig tsconfig.json lib/labs-from-genetic.test.ts
 */
import assert from "node:assert/strict";
import { labsFromGeneticStructured } from "./labs-from-genetic";

// ---------- Empty / bad shapes ----------

assert.deepEqual(labsFromGeneticStructured(null), {});
assert.deepEqual(labsFromGeneticStructured(undefined), {});
assert.deepEqual(labsFromGeneticStructured("garbage"), {});
assert.deepEqual(labsFromGeneticStructured([1, 2, 3]), {});
// Unknown gene keys stay unmapped.
assert.deepEqual(labsFromGeneticStructured({ SOMEGENE: true }), {});

// ---------- Boolean shape ----------

assert.deepEqual(
  labsFromGeneticStructured({ MTHFR: true, COMT: false }),
  { snpMthfr: true, snpComtImpaired: false },
);

// Case-insensitive.
assert.deepEqual(labsFromGeneticStructured({ mthfr: true }), {
  snpMthfr: true,
});

// ---------- Genotype string shape ----------

// TT / CC / AA / GG / variant / hetero → true
assert.deepEqual(
  labsFromGeneticStructured({ MTHFR: "TT", COMT: "variant" }),
  { snpMthfr: true, snpComtImpaired: true },
);

// Wild-type strings → false
assert.deepEqual(labsFromGeneticStructured({ MTHFR: "wild" }), {
  snpMthfr: false,
});
assert.deepEqual(labsFromGeneticStructured({ CYP1A1: "normal" }), {
  snpCyp1a1: false,
});

// Unrecognised genotype string → gene absent (rules engine treats as unknown).
assert.deepEqual(labsFromGeneticStructured({ MTHFR: "gibberish" }), {});

// ---------- Object shapes ----------

// { impaired: true }
assert.deepEqual(
  labsFromGeneticStructured({ MTHFR: { impaired: true } }),
  { snpMthfr: true },
);

// { variant: false }
assert.deepEqual(
  labsFromGeneticStructured({ COMT: { variant: false } }),
  { snpComtImpaired: false },
);

// { heterozygous: true } → true (any variant present)
assert.deepEqual(
  labsFromGeneticStructured({ CYP1A1: { heterozygous: true } }),
  { snpCyp1a1: true },
);

// { genotype: "TT" } → true
assert.deepEqual(
  labsFromGeneticStructured({ CYP1B1: { genotype: "TT" } }),
  { snpCyp1b1: true },
);

// { result: "wildtype" } → false
assert.deepEqual(
  labsFromGeneticStructured({ MTHFR: { result: "wildtype" } }),
  { snpMthfr: false },
);

// ---------- Nested { snps: { ... } } container ----------

assert.deepEqual(
  labsFromGeneticStructured({
    snps: { MTHFR: "TT", COMT: { impaired: true } },
  }),
  { snpMthfr: true, snpComtImpaired: true },
);

// Top-level wins over nested when both name the same gene.
{
  const out = labsFromGeneticStructured({
    MTHFR: false,
    snps: { MTHFR: true },
  });
  assert.deepEqual(out, { snpMthfr: false });
}

// ---------- variants: [{ gene, ... }] shape ----------

assert.deepEqual(
  labsFromGeneticStructured({
    variants: [
      { gene: "MTHFR", impaired: true },
      { gene: "COMT", genotype: "wild" },
      { gene: "ALDH2", impaired: true }, // unknown gene ignored
    ],
  }),
  { snpMthfr: true, snpComtImpaired: false },
);

// { name: "..." } is accepted as an alias for gene.
assert.deepEqual(
  labsFromGeneticStructured({
    variants: [{ name: "CYP1A1", variant: true }],
  }),
  { snpCyp1a1: true },
);

// ---------- Mixed real-world payload ----------

{
  const out = labsFromGeneticStructured({
    provider: "AcmeGenomics",
    reported_at: "2026-09-27",
    MTHFR: { heterozygous: true }, // heterozygous alias → true
    snps: {
      CYP1A1: "wild",
      CYP1B1: { impaired: true },
    },
    variants: [
      { gene: "COMT", genotype: "TT" },
    ],
  });
  assert.deepEqual(out, {
    snpMthfr: true,
    snpCyp1a1: false,
    snpCyp1b1: true,
    snpComtImpaired: true,
  });
}

// eslint-disable-next-line no-console
console.log("labs-from-genetic.test.ts OK");
