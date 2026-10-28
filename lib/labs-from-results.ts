/**
 * Turns saved test_results rows into LabInputs for the rules engine.
 * Parsing stays here so rules-engine.ts stays IF-THEN logic only.
 *
 * Two rules govern everything below:
 *
 *  1. Free text is display-only. A finding is set from a structured result key
 *     (see lib/result-findings.ts) read through its flag, never because a row's
 *     text happens to contain a marker's name. "Zonulin negative" contains the
 *     word zonulin.
 *  2. The newest result wins. Rows arrive newest-first from
 *     loadOwnTestResults, so they are re-ordered oldest-first here and later
 *     assignments overwrite earlier ones. Without that, a retest was ignored
 *     in favour of the original value.
 *
 * This is information mapping, not a diagnosis.
 */
import { THRESHOLDS } from "@/lib/clinical-thresholds";
import { parseFiniteNumber } from "@/lib/questionnaire/numbers";
import { applyFindingRow, findingState } from "@/lib/result-findings";
import { PHASE1_LABS, type LabInputs } from "@/lib/rules-engine";
import type { TestResultRow } from "@/lib/test-results";

function blobOf(row: TestResultRow): string {
  return [
    row.test_name,
    row.plain_name ?? "",
    row.result_value ?? "",
    row.reference_range ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function isTerm(row: TestResultRow, key: string): boolean {
  return row.test_name.trim() === key;
}

function flagIs(row: TestResultRow, ...flags: string[]): boolean {
  const flag = (row.flag ?? "").toLowerCase();
  return flags.includes(flag);
}

function mentions(blob: string, ...needles: string[]): boolean {
  return needles.some((needle) => blob.includes(needle));
}

function timeOf(row: TestResultRow): number {
  const parsed = Date.parse(row.created_at);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Genes read from an `snp` result row. A bare mention of a gene is not a
 * finding — only the flag says whether a variant was found. Zygosity cannot be
 * expressed through a flag, so the genetic-test pipeline
 * (lib/labs-from-genetic.ts) remains the proper source for SNP interpretation.
 */
const SNP_GENES: { needle: string; field: keyof LabInputs }[] = [
  { needle: "mthfr", field: "snpMthfr" },
  { needle: "comt", field: "snpComtImpaired" },
  { needle: "cyp1a1", field: "snpCyp1a1" },
  { needle: "cyp1b1", field: "snpCyp1b1" },
];

/**
 * Read lab flags/values into the engine input bag.
 * Unknown rows are ignored — never crash.
 */
export function labsFromTestResults(rows: TestResultRow[]): LabInputs {
  const labs: LabInputs = { ...PHASE1_LABS };

  // Oldest first, so the newest result is applied last and wins.
  const ordered = [...rows].sort((a, b) => timeOf(a) - timeOf(b));

  for (const row of ordered) {
    // Structured findings first. They are skipped by the name-matching below:
    // a thyroidAntibodies row contains "thyroid" and must not be read as TSH.
    if (applyFindingRow(row, labs)) {
      continue;
    }

    const blob = blobOf(row);
    const numeric = parseFiniteNumber(row.result_value);

    if (isTerm(row, "fastingInsulin") || mentions(blob, "fasting insulin")) {
      if (numeric !== null) {
        labs.fastingInsulin = numeric;
      } else if (flagIs(row, "high", "critical")) {
        labs.fastingInsulin = THRESHOLDS.fastingInsulin_elevated + 1;
      }
    }

    if (isTerm(row, "thyroid") || mentions(blob, "thyroid", "tsh")) {
      if (numeric !== null) {
        labs.tsh = numeric;
      }
      if (flagIs(row, "high", "critical", "low")) {
        labs.abnormalThyroidFunction = true;
      }
    }

    // Older combined thyroid rows ("TPO antibodies", flagged positive) still
    // block iodine. Only a positive can be read this way; a measured NEGATIVE
    // must come from the thyroidAntibodies key.
    if (
      mentions(blob, "antibod", "tpoab", "tgab", "tpo ", "anti-tpo") &&
      flagIs(row, "positive")
    ) {
      labs.thyroidAntibodiesPositive = true;
    }
    if (
      isTerm(row, "thyroid") &&
      flagIs(row, "positive") &&
      mentions(blob, "antibod", "tpo", "tgab")
    ) {
      labs.thyroidAntibodiesPositive = true;
    }

    if (isTerm(row, "urinaryIodine") || mentions(blob, "urinary iodine")) {
      if (flagIs(row, "low")) {
        labs.urinaryIodineLow = true;
      } else if (flagIs(row, "normal", "high", "negative")) {
        labs.urinaryIodineLow = false;
      }
    }

    // Read by its result key and flag only. A measured normal result sets
    // false, which is what closes the Phase 1 "lean on the stress answer"
    // proxy in DUTCH Rule B once cortisol has actually been measured.
    if (isTerm(row, "salivaryCortisol")) {
      if (flagIs(row, "high", "low", "critical", "positive")) {
        labs.cortisolAbnormal = true;
        labs.adrenalResilienceImpaired = true;
      } else if (flagIs(row, "normal", "negative")) {
        labs.cortisolAbnormal = false;
        labs.adrenalResilienceImpaired = false;
      }
    }

    if (isTerm(row, "cyp450") && flagIs(row, "high", "critical", "positive")) {
      labs.liverDetoxOrBarrierImpaired = true;
    }

    if (isTerm(row, "heavyMetals") && flagIs(row, "high", "critical", "positive")) {
      labs.elevatedToxinExposure = true;
    }

    if (isTerm(row, "dutch") && flagIs(row, "high", "critical", "positive")) {
      labs.oestrogenDetoxImpaired = true;
    }

    if (isTerm(row, "snp") || mentions(blob, "snp")) {
      const state = findingState(row.flag, ["positive", "critical"]);
      if (state !== "unknown") {
        for (const gene of SNP_GENES) {
          if (mentions(blob, gene.needle)) {
            (labs[gene.field] as boolean | null) = state === "present";
          }
        }
      }
    }
  }

  return labs;
}
