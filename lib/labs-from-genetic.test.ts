/**
 * Genetic-result payload -> SNP lab inputs.
 *
 *   npm run test:labs-from-genetic
 *
 * Two things this mapper must get right, because DUTCH Rule A turns on them:
 *
 *  1. ZYGOSITY. The protocol wants a homozygous variant or a double
 *     heterozygous combination. A single heterozygous copy is not that, and a
 *     "variant present" with no copy count cannot show either.
 *  2. GENOTYPE LETTERS ARE NOT SELF-EVIDENT. Whether "CC" is normal or variant
 *     depends on which allele is the reference for that SNP (for MTHFR C677T,
 *     CC is the NORMAL genotype). A fixed list of "impaired-looking" strings
 *     read CC, TT, AA and GG all as impaired, so a wildtype patient triggered
 *     the rule. Letters are now interpreted only through a clinician-supplied
 *     allele table, and an unrecognised genotype is "unknown", never a guess.
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

// ---------- Boolean shape: variant present, zygosity unreported ----------

assert.deepEqual(
  labsFromGeneticStructured({ MTHFR: true, COMT: false }),
  { snpMthfr: true, snpComtImpaired: false },
);

// Case-insensitive.
assert.deepEqual(labsFromGeneticStructured({ mthfr: true }), {
  snpMthfr: true,
});

// ---------- Plain words ----------

// "variant" / "positive" / "impaired" say a variant exists, not how many copies.
assert.deepEqual(labsFromGeneticStructured({ MTHFR: "variant", COMT: "positive" }), {
  snpMthfr: true,
  snpComtImpaired: true,
});

// Wild-type words -> false
assert.deepEqual(labsFromGeneticStructured({ MTHFR: "wild" }), { snpMthfr: false });
assert.deepEqual(labsFromGeneticStructured({ CYP1A1: "normal" }), { snpCyp1a1: false });
assert.deepEqual(labsFromGeneticStructured({ COMT: "wildtype" }), { snpComtImpaired: false });

// ---------- Zygosity ----------

assert.deepEqual(labsFromGeneticStructured({ MTHFR: "heterozygous" }), {
  snpMthfr: true,
  snpZygosity: { mthfr: "het" },
});
assert.deepEqual(labsFromGeneticStructured({ COMT: "homozygous" }), {
  snpComtImpaired: true,
  snpZygosity: { comt: "hom" },
});
assert.deepEqual(labsFromGeneticStructured({ CYP1A1: { heterozygous: true } }), {
  snpCyp1a1: true,
  snpZygosity: { cyp1a1: "het" },
});
assert.deepEqual(labsFromGeneticStructured({ CYP1B1: { homozygous: true } }), {
  snpCyp1b1: true,
  snpZygosity: { cyp1b1: "hom" },
});
assert.deepEqual(labsFromGeneticStructured({ MTHFR: { zygosity: "hom" } }), {
  snpMthfr: true,
  snpZygosity: { mthfr: "hom" },
});
// The more specific statement wins over a bare "impaired".
assert.deepEqual(
  labsFromGeneticStructured({ MTHFR: { impaired: true, homozygous: true } }),
  { snpMthfr: true, snpZygosity: { mthfr: "hom" } },
);

// ---------- Object shapes without zygosity ----------

assert.deepEqual(labsFromGeneticStructured({ MTHFR: { impaired: true } }), { snpMthfr: true });
assert.deepEqual(labsFromGeneticStructured({ COMT: { variant: false } }), {
  snpComtImpaired: false,
});
assert.deepEqual(labsFromGeneticStructured({ MTHFR: { result: "wildtype" } }), {
  snpMthfr: false,
});

// ---------- Genotype letters are NOT interpreted without a table ----------

// None of these may read as impaired, wildtype, or anything else.
for (const genotype of ["CC", "CT", "TC", "TT", "AA", "AG", "GG", "cc", "tt"]) {
  assert.deepEqual(
    labsFromGeneticStructured({ MTHFR: genotype }),
    {},
    `bare genotype "${genotype}" must be unknown`,
  );
  assert.deepEqual(
    labsFromGeneticStructured({ MTHFR: { genotype } }),
    {},
    `{ genotype: "${genotype}" } must be unknown`,
  );
}

// Unrecognised strings stay unknown too.
assert.deepEqual(labsFromGeneticStructured({ MTHFR: "gibberish" }), {});

// ---------- Genotype letters through a clinician-supplied allele table ----------

// MTHFR C677T for illustration only: the shipped table is empty, because the
// reference and variant alleles are a clinical fact for clinicians to supply,
// not something to guess here.
const TABLE = { mthfr: { ref: "C", variant: "T" } } as const;

assert.deepEqual(labsFromGeneticStructured({ MTHFR: "CC" }, TABLE), { snpMthfr: false });
assert.deepEqual(labsFromGeneticStructured({ MTHFR: "CT" }, TABLE), {
  snpMthfr: true,
  snpZygosity: { mthfr: "het" },
});
assert.deepEqual(labsFromGeneticStructured({ MTHFR: "tc" }, TABLE), {
  snpMthfr: true,
  snpZygosity: { mthfr: "het" },
});
assert.deepEqual(labsFromGeneticStructured({ MTHFR: { genotype: "TT" } }, TABLE), {
  snpMthfr: true,
  snpZygosity: { mthfr: "hom" },
});
// Letters the table does not list, and wrong lengths, are unknown.
for (const bad of ["AA", "AG", "C", "CTT", "", "C T"]) {
  assert.deepEqual(
    labsFromGeneticStructured({ MTHFR: bad }, TABLE),
    {},
    `"${bad}" must be unknown against the MTHFR table`,
  );
}
// A gene with no table entry stays unknown even if another gene has one.
assert.deepEqual(labsFromGeneticStructured({ COMT: "GG" }, TABLE), {});

// ---------- Phase I pharmacokinetic genes: any altered allele, no zygosity ----------

assert.deepEqual(labsFromGeneticStructured({ CYP2D6: "heterozygous" }), { snpCyp2d6: true });
assert.deepEqual(labsFromGeneticStructured({ CYP2C19: "homozygous" }), { snpCyp2c19: true });
assert.deepEqual(labsFromGeneticStructured({ CYP2C9: "wildtype" }), { snpCyp2c9: false });
// CYP3A4 and CYP3A5 are reported together and land on one field.
assert.deepEqual(labsFromGeneticStructured({ CYP3A5: true }), { snpCyp3a4: true });

// ---------- Nested { snps: { ... } } container ----------

assert.deepEqual(
  labsFromGeneticStructured({
    snps: { MTHFR: "variant", COMT: { impaired: true } },
  }),
  { snpMthfr: true, snpComtImpaired: true },
);

// Top-level wins over nested when both name the same gene.
assert.deepEqual(
  labsFromGeneticStructured({ MTHFR: false, snps: { MTHFR: true } }),
  { snpMthfr: false },
);
// ...including its zygosity: a nested "hom" does not leak into a top-level call.
assert.deepEqual(
  labsFromGeneticStructured({ MTHFR: "heterozygous", snps: { MTHFR: "homozygous" } }),
  { snpMthfr: true, snpZygosity: { mthfr: "het" } },
);

// ---------- variants: [{ gene, ... }] shape ----------

assert.deepEqual(
  labsFromGeneticStructured({
    variants: [
      { gene: "MTHFR", impaired: true },
      { gene: "COMT", genotype: "wild" },
      { gene: "ALDH2", impaired: true }, // unknown gene ignored
    ],
  }),
  // "wild" is a plain wildtype word (not letters), so it reads as wildtype.
  { snpMthfr: true, snpComtImpaired: false },
);

assert.deepEqual(
  labsFromGeneticStructured({ variants: [{ name: "CYP1A1", variant: true }] }),
  { snpCyp1a1: true },
);

assert.deepEqual(
  labsFromGeneticStructured({ variants: [{ gene: "COMT", zygosity: "hom" }] }),
  { snpComtImpaired: true, snpZygosity: { comt: "hom" } },
);

// ---------- Mixed real-world payload ----------

{
  const out = labsFromGeneticStructured({
    provider: "AcmeGenomics",
    reported_at: "2026-09-27",
    MTHFR: { heterozygous: true },
    snps: {
      CYP1A1: "wild",
      CYP1B1: { impaired: true },
    },
    variants: [{ gene: "COMT", zygosity: "homozygous" }],
  });
  assert.deepEqual(out, {
    snpMthfr: true,
    snpCyp1a1: false,
    snpCyp1b1: true,
    snpComtImpaired: true,
    snpZygosity: { mthfr: "het", comt: "hom" },
  });
}

// ---------- Merging several panels (newest first) ----------
//
// plan.ts merges every panel on top of the biochemistry labs. The first call
// for a gene wins, and its zygosity must come from THAT SAME panel. A generic
// per-key merge let the newest panel's zygosity for one gene block an older
// panel's zygosity for a different gene, leaving a variant with its copy count
// missing: read as "zygosity unreported", it silently under-triggers DUTCH.

import { PHASE1_LABS, type LabInputs } from "./rules-engine";
import { applyGeneticLabs } from "./labs-from-genetic";

function mergePanels(...panels: Parameters<typeof labsFromGeneticStructured>[0][]): LabInputs {
  const labs: LabInputs = { ...PHASE1_LABS };
  for (const panel of panels) {
    applyGeneticLabs(labs, labsFromGeneticStructured(panel));
  }
  return labs;
}

{
  // Newest panel: MTHFR het. Older panel: COMT hom. Both must survive.
  const labs = mergePanels({ MTHFR: "heterozygous" }, { COMT: "homozygous" });
  assert.equal(labs.snpMthfr, true);
  assert.equal(labs.snpComtImpaired, true);
  assert.deepEqual(labs.snpZygosity, { mthfr: "het", comt: "hom" });
}

{
  // The newest call for a gene wins, with its own zygosity, and an older
  // panel's different answer for the same gene is ignored entirely.
  const labs = mergePanels({ MTHFR: "heterozygous" }, { MTHFR: "homozygous" });
  assert.equal(labs.snpMthfr, true);
  assert.deepEqual(labs.snpZygosity, { mthfr: "het" });
}

{
  // A newer wildtype is a definite answer: an older variant must not override
  // it, and must not leave a stray zygosity entry behind.
  const labs = mergePanels({ MTHFR: "wildtype" }, { MTHFR: "homozygous" });
  assert.equal(labs.snpMthfr, false);
  assert.equal(labs.snpZygosity, undefined);
}

{
  // A bare "variant" in the newest panel sets the boolean and records no
  // zygosity, and an older panel's zygosity for that gene must not fill it in.
  const labs = mergePanels({ COMT: "variant" }, { COMT: "homozygous" });
  assert.equal(labs.snpComtImpaired, true);
  assert.equal(labs.snpZygosity, undefined);
}

{
  // Merging never writes into the shared PHASE1_LABS default.
  const before = JSON.stringify(PHASE1_LABS);
  mergePanels({ MTHFR: "homozygous" });
  assert.equal(JSON.stringify(PHASE1_LABS), before);
}

{
  // Biochemistry-derived values already in the bag are not overwritten.
  const labs: LabInputs = { ...PHASE1_LABS, snpMthfr: false };
  applyGeneticLabs(labs, labsFromGeneticStructured({ MTHFR: "homozygous" }));
  assert.equal(labs.snpMthfr, false);
  assert.equal(labs.snpZygosity, undefined);
}

console.log("labs-from-genetic.test.ts OK");
