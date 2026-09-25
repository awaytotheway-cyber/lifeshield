/**
 * Turn a genetic-result `structured` jsonb payload into the SNP subset of
 * LabInputs the rules engine already knows about (MTHFR, COMT, CYP1A1,
 * CYP1B1). Runs alongside labsFromTestResults so a plan can factor in
 * both biochemistry and genetics without another mapper on the caller.
 *
 * Payload shape (permissive on purpose — the partner contract isn't
 * signed yet, plan §18 Q2). Any of these forms per gene works:
 *
 *   { MTHFR: true }
 *   { MTHFR: "variant" }
 *   { MTHFR: { impaired: true } }
 *   { MTHFR: { genotype: "TT" } }
 *   { snps: { MTHFR: { impaired: true } } }
 *   { variants: [{ gene: "MTHFR", impaired: true }] }
 *
 * Any unrecognised shape yields undefined for that gene rather than a
 * false negative — the rules engine treats null as "unknown" and only
 * fires SNP-gated pairs when the answer is definitively true, so keeping
 * unmapped genes out of the returned object is the safe default.
 */
import type { LabInputs } from "@/lib/rules-engine";

/** SNP subset of LabInputs this mapper writes into. Kept explicit so a
 *  later engine field addition doesn't accidentally get set from
 *  genetics without an explicit mapping. */
export type GeneticLabSubset = Pick<
  LabInputs,
  "snpMthfr" | "snpComtImpaired" | "snpCyp1a1" | "snpCyp1b1"
>;

const IMPAIRED_GENOTYPES = new Set([
  "tt",
  "aa",
  "gg",
  "cc",
  "variant",
  "hetero",
  "heterozygous",
  "homo",
  "homozygous",
  "positive",
]);

const WILDTYPE_GENOTYPES = new Set([
  "wt",
  "wild",
  "wildtype",
  "wild-type",
  "normal",
  "negative",
]);

/**
 * Reads a permissive per-gene record and returns:
 *   true  → variant present / impaired
 *   false → wildtype
 *   undefined → gene absent or shape unrecognised (rules engine treats as unknown)
 */
function readGeneStatus(value: unknown): boolean | undefined {
  if (value === true || value === false) return value;

  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (IMPAIRED_GENOTYPES.has(lower)) return true;
    if (WILDTYPE_GENOTYPES.has(lower)) return false;
    return undefined;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    // Direct booleans win first.
    if (record.impaired === true || record.variant === true) return true;
    if (record.impaired === false || record.variant === false) return false;
    if (
      record.heterozygous === true ||
      record.homozygous === true ||
      record.positive === true
    ) {
      return true;
    }
    // Genotype string ("TT", "CT", "wild")
    if (typeof record.genotype === "string") {
      return readGeneStatus(record.genotype);
    }
    if (typeof record.result === "string") {
      return readGeneStatus(record.result);
    }
  }

  return undefined;
}

const GENE_TO_LAB: Record<string, keyof GeneticLabSubset> = {
  mthfr: "snpMthfr",
  comt: "snpComtImpaired",
  cyp1a1: "snpCyp1a1",
  cyp1b1: "snpCyp1b1",
};

function readGeneMap(source: Record<string, unknown>): Partial<GeneticLabSubset> {
  const out: Partial<GeneticLabSubset> = {};
  for (const [key, value] of Object.entries(source)) {
    const normalised = key.trim().toLowerCase();
    const field = GENE_TO_LAB[normalised];
    if (!field) continue;
    const status = readGeneStatus(value);
    if (status === undefined) continue;
    // First non-undefined status wins so a nested map doesn't quietly
    // overwrite the top-level authoritative flag.
    if (out[field] === undefined) {
      out[field] = status;
    }
  }
  return out;
}

/**
 * Public entry point. Merges results from every recognised container in
 * the payload — top-level gene keys, a nested `snps` container, and an
 * array-shaped `variants` list — into a single Partial<GeneticLabSubset>.
 *
 * A null / undefined / non-object payload returns {} (rules engine keeps
 * the unknown state for every SNP field).
 */
export function labsFromGeneticStructured(
  structured: unknown,
): Partial<GeneticLabSubset> {
  if (!structured || typeof structured !== "object" || Array.isArray(structured)) {
    return {};
  }
  const record = structured as Record<string, unknown>;
  const out: Partial<GeneticLabSubset> = { ...readGeneMap(record) };

  const nested = record.snps;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const nestedResult = readGeneMap(nested as Record<string, unknown>);
    for (const [key, value] of Object.entries(nestedResult)) {
      const field = key as keyof GeneticLabSubset;
      if (out[field] === undefined) out[field] = value;
    }
  }

  const variants = record.variants;
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
      const field = GENE_TO_LAB[geneKey.trim().toLowerCase()];
      if (!field) continue;
      const status = readGeneStatus(item);
      if (status === undefined) continue;
      if (out[field] === undefined) out[field] = status;
    }
  }

  return out;
}
