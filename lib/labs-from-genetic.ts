/**
 * Turn a genetic-result `structured` jsonb payload into the SNP subset of
 * LabInputs the rules engine already knows about (MTHFR, COMT, CYP1A1,
 * CYP1B1, and the five phase I pharmacokinetic CYPs). Runs alongside
 * labsFromTestResults so a plan can factor in both biochemistry and genetics
 * without another mapper on the caller.
 *
 * Payload shape (permissive on purpose — the partner contract isn't signed
 * yet, plan §18 Q2). Any of these forms per gene works:
 *
 *   { MTHFR: true }
 *   { MTHFR: "variant" }               { MTHFR: "heterozygous" }
 *   { MTHFR: { impaired: true } }      { MTHFR: { homozygous: true } }
 *   { MTHFR: { zygosity: "hom" } }     { MTHFR: { genotype: "CT" } }
 *   { snps: { MTHFR: { impaired: true } } }
 *   { variants: [{ gene: "MTHFR", impaired: true }] }
 *
 * What the output means:
 *
 *   - For each gene, true = a variant was reported, false = wildtype, absent =
 *     unknown. Unknown is never turned into false: the rules engine fires
 *     SNP-gated pairs only on a definite true.
 *   - For the four oestrogen-metabolism genes, `snpZygosity` additionally
 *     records "het" or "hom" when the panel said so. DUTCH Rule A needs a
 *     homozygous variant or two heterozygous genes, so a bare "variant" (true
 *     with no zygosity) deliberately cannot satisfy it.
 *
 * GENOTYPE LETTERS ARE NOT SELF-EVIDENT. Whether "CC" is normal or variant
 * depends on which allele is the reference for that particular SNP — for MTHFR
 * C677T, CC is the normal genotype. An earlier version treated CC, TT, AA and
 * GG all as impaired, so a wildtype patient read as variant. Letters are now
 * read only through GENOTYPE_TABLE, a clinician-supplied reference/variant
 * allele pair per gene, and anything that does not match is unknown.
 * GENOTYPE_TABLE ships EMPTY: those alleles are a clinical fact for the
 * clinicians to supply once the partner's payload and SNP list are known, not
 * something to fill in from memory here.
 */
import type { LabInputs, OestrogenGene } from "@/lib/rules-engine";

/** SNP subset of LabInputs this mapper writes into. Kept explicit so a
 *  later engine field addition doesn't accidentally get set from
 *  genetics without an explicit mapping. */
export type GeneticLabSubset = Pick<
  LabInputs,
  | "snpMthfr"
  | "snpComtImpaired"
  | "snpCyp1a1"
  | "snpCyp1b1"
  | "snpCyp1a2"
  | "snpCyp2c9"
  | "snpCyp2c19"
  | "snpCyp2d6"
  | "snpCyp3a4"
  | "snpZygosity"
>;

/**
 * One gene's reported result.
 *   ref     — wildtype
 *   het     — one copy of the variant allele
 *   hom     — two copies
 *   variant — a variant is reported but the panel did not say how many copies
 */
export type GeneCall = "ref" | "het" | "hom" | "variant";

/** Reference and variant allele for one gene, as single letters. */
export type AlleleDef = { ref: string; variant: string };

/** Keyed by lower-case gene name, e.g. "mthfr". */
export type AlleleTable = Readonly<Record<string, AlleleDef | undefined>>;

/** Empty on purpose — see the file header. */
export const GENOTYPE_TABLE: AlleleTable = {};

const WILDTYPE_WORDS = new Set([
  "ref",
  "wt",
  "wild",
  "wildtype",
  "wild-type",
  "normal",
  "negative",
]);
const HET_WORDS = new Set(["het", "hetero", "heterozygous"]);
const HOM_WORDS = new Set(["hom", "homo", "homozygous"]);
const VARIANT_WORDS = new Set(["variant", "positive", "impaired"]);

function callFromWord(raw: string): GeneCall | undefined {
  const word = raw.trim().toLowerCase();
  if (WILDTYPE_WORDS.has(word)) return "ref";
  if (HET_WORDS.has(word)) return "het";
  if (HOM_WORDS.has(word)) return "hom";
  if (VARIANT_WORDS.has(word)) return "variant";
  return undefined;
}

/**
 * Reads a two-letter genotype against the gene's reference and variant allele.
 * Anything that is not exactly two alleles from that pair is unknown.
 */
function callFromGenotype(
  gene: string,
  genotype: string,
  table: AlleleTable,
): GeneCall | undefined {
  const def = table[gene];
  if (!def) return undefined;
  const letters = genotype.trim().toUpperCase();
  if (letters.length !== 2) return undefined;
  const ref = def.ref.toUpperCase();
  const variant = def.variant.toUpperCase();
  let copies = 0;
  for (const letter of letters) {
    if (letter === variant) {
      copies += 1;
    } else if (letter !== ref) {
      return undefined;
    }
  }
  return copies === 0 ? "ref" : copies === 1 ? "het" : "hom";
}

/**
 * Reads a permissive per-gene value. Returns undefined when the gene is absent
 * or the shape is unrecognised (the rules engine then treats it as unknown).
 */
function readGeneCall(
  gene: string,
  value: unknown,
  table: AlleleTable,
): GeneCall | undefined {
  if (value === true) return "variant";
  if (value === false) return "ref";

  if (typeof value === "string") {
    return callFromWord(value) ?? callFromGenotype(gene, value, table);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    // The most specific statement wins: copies before "variant present".
    if (record.homozygous === true) return "hom";
    if (record.heterozygous === true) return "het";
    if (typeof record.zygosity === "string") {
      const fromZygosity = callFromWord(record.zygosity);
      if (fromZygosity) return fromZygosity;
    }
    if (
      record.impaired === true ||
      record.variant === true ||
      record.positive === true
    ) {
      return "variant";
    }
    if (record.impaired === false || record.variant === false) return "ref";
    if (typeof record.genotype === "string") {
      return readGeneCall(gene, record.genotype, table);
    }
    if (typeof record.result === "string") {
      return readGeneCall(gene, record.result, table);
    }
  }

  return undefined;
}

type GeneMapping = {
  field: keyof Omit<GeneticLabSubset, "snpZygosity">;
  /** Set for the four oestrogen genes: where their zygosity is recorded. */
  oestrogen?: OestrogenGene;
};

const GENES: Record<string, GeneMapping> = {
  // Oestrogen metabolism — drive the DUTCH and stool rules.
  mthfr: { field: "snpMthfr", oestrogen: "mthfr" },
  comt: { field: "snpComtImpaired", oestrogen: "comt" },
  cyp1a1: { field: "snpCyp1a1", oestrogen: "cyp1a1" },
  cyp1b1: { field: "snpCyp1b1", oestrogen: "cyp1b1" },
  // Phase I pharmacokinetics — drive the CYP450 assessment. Any altered allele
  // counts, so no zygosity is kept for these. CYP3A4 and CYP3A5 are reported
  // together by most panels and the source rule treats them as one trigger,
  // so both aliases land on the same field.
  cyp1a2: { field: "snpCyp1a2" },
  cyp2c9: { field: "snpCyp2c9" },
  cyp2c19: { field: "snpCyp2c19" },
  cyp2d6: { field: "snpCyp2d6" },
  cyp3a4: { field: "snpCyp3a4" },
  cyp3a5: { field: "snpCyp3a4" },
};

type CallsByField = Partial<
  Record<GeneMapping["field"], { call: GeneCall; mapping: GeneMapping }>
>;

/**
 * Records one gene's call. The first call for a field wins, so a nested
 * container cannot quietly overwrite the top-level authoritative one.
 */
function record(
  calls: CallsByField,
  geneName: string,
  value: unknown,
  table: AlleleTable,
): void {
  const gene = geneName.trim().toLowerCase();
  const mapping = GENES[gene];
  if (!mapping) return;
  const call = readGeneCall(gene, value, table);
  if (call === undefined) return;
  if (calls[mapping.field] === undefined) {
    calls[mapping.field] = { call, mapping };
  }
}

function recordMap(
  calls: CallsByField,
  source: Record<string, unknown>,
  table: AlleleTable,
): void {
  for (const [key, value] of Object.entries(source)) {
    record(calls, key, value, table);
  }
}

/**
 * Public entry point. Merges results from every recognised container in the
 * payload — top-level gene keys, a nested `snps` container, and an
 * array-shaped `variants` list — into a single Partial<GeneticLabSubset>.
 *
 * A null / undefined / non-object payload returns {} (rules engine keeps the
 * unknown state for every SNP field).
 */
export function labsFromGeneticStructured(
  structured: unknown,
  table: AlleleTable = GENOTYPE_TABLE,
): Partial<GeneticLabSubset> {
  if (!structured || typeof structured !== "object" || Array.isArray(structured)) {
    return {};
  }
  const source = structured as Record<string, unknown>;
  const calls: CallsByField = {};

  recordMap(calls, source, table);

  const nested = source.snps;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    recordMap(calls, nested as Record<string, unknown>, table);
  }

  const variants = source.variants;
  if (Array.isArray(variants)) {
    for (const entry of variants) {
      if (!entry || typeof entry !== "object") continue;
      const item = entry as Record<string, unknown>;
      const geneKey =
        typeof item.gene === "string"
          ? item.gene
          : typeof item.name === "string"
            ? item.name
            : null;
      if (!geneKey) continue;
      record(calls, geneKey, item, table);
    }
  }

  const out: Partial<GeneticLabSubset> = {};
  const zygosity: Partial<Record<OestrogenGene, "het" | "hom">> = {};
  for (const [field, entry] of Object.entries(calls) as [
    GeneMapping["field"],
    { call: GeneCall; mapping: GeneMapping },
  ][]) {
    out[field] = entry.call !== "ref";
    if (entry.mapping.oestrogen && (entry.call === "het" || entry.call === "hom")) {
      zygosity[entry.mapping.oestrogen] = entry.call;
    }
  }
  if (Object.keys(zygosity).length > 0) {
    out.snpZygosity = zygosity;
  }
  return out;
}

/** Which lab-input field holds each oestrogen gene's "variant reported" flag. */
const OESTROGEN_FIELD: Record<OestrogenGene, keyof GeneticLabSubset> = {
  cyp1a1: "snpCyp1a1",
  cyp1b1: "snpCyp1b1",
  comt: "snpComtImpaired",
  mthfr: "snpMthfr",
};

/**
 * Merges one panel's result onto the lab inputs. Call it newest panel first:
 * the first call for a gene wins, and anything already known (from another
 * panel or from the biochemistry mapper) is never overwritten.
 *
 * A gene's zygosity is taken only from the panel that supplied that gene's
 * call. Merging each key on its own let one panel's zygosity for one gene
 * block another panel's zygosity for a different gene, leaving a variant
 * whose copy count was missing. That reads as "zygosity unreported" and
 * silently under-triggers DUTCH Rule A.
 */
export function applyGeneticLabs(
  labs: LabInputs,
  genetic: Partial<GeneticLabSubset>,
): void {
  const supplied = new Set<string>();
  for (const [key, value] of Object.entries(genetic)) {
    if (key === "snpZygosity" || value === undefined) continue;
    const field = key as keyof LabInputs;
    if (labs[field] === null || labs[field] === undefined) {
      (labs as Record<string, unknown>)[field] = value;
      supplied.add(field);
    }
  }

  const zygosity = genetic.snpZygosity;
  if (!zygosity) return;
  for (const gene of Object.keys(zygosity) as OestrogenGene[]) {
    if (!supplied.has(OESTROGEN_FIELD[gene])) continue;
    // A fresh object each time, never a mutation of a shared default.
    labs.snpZygosity = { ...(labs.snpZygosity ?? {}), [gene]: zygosity[gene] };
  }
}
