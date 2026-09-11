/**
 * Turns saved test_results rows into LabInputs for the rules engine.
 * Parsing stays here so rules-engine.ts stays IF-THEN logic only.
 *
 * This is information mapping, not a diagnosis.
 */
import { THRESHOLDS } from "@/lib/clinical-thresholds";
import { parseFiniteNumber } from "@/lib/questionnaire/numbers";
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

/**
 * Read lab flags/values into the engine input bag.
 * Unknown rows are ignored — never crash.
 */
export function labsFromTestResults(rows: TestResultRow[]): LabInputs {
  const labs: LabInputs = { ...PHASE1_LABS };

  for (const row of rows) {
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

    if (
      isTerm(row, "salivaryCortisol") ||
      mentions(blob, "salivary cortisol", "cortisol")
    ) {
      if (flagIs(row, "high", "low", "critical", "positive")) {
        labs.cortisolAbnormal = true;
        labs.adrenalResilienceImpaired = true;
      }
    }

    if (isTerm(row, "stool") || mentions(blob, "stool")) {
      if (mentions(blob, "dysbiosis")) {
        labs.stoolDysbiosis = true;
      }
      if (mentions(blob, "glucuronidase")) {
        labs.stoolBetaGlucuronidaseRaised = true;
      }
      if (mentions(blob, "zonulin")) {
        labs.zonulinPositive = true;
      }
      if (mentions(blob, "undigested")) {
        labs.undigestedProteinOrFat = true;
      }
    }

    if (mentions(blob, "barrier") && mentions(blob, "liver", "detox", "gut")) {
      labs.liverDetoxOrBarrierImpaired = true;
    }
    if (isTerm(row, "cyp450") && flagIs(row, "high", "critical", "positive")) {
      labs.liverDetoxOrBarrierImpaired = true;
    }

    if (isTerm(row, "heavyMetals") && flagIs(row, "high", "critical", "positive")) {
      labs.elevatedToxinExposure = true;
    }
    if (mentions(blob, "elevated toxin")) {
      labs.elevatedToxinExposure = true;
    }

    if (
      (isTerm(row, "dutch") && flagIs(row, "high", "critical", "positive")) ||
      mentions(blob, "oestrogen-detox", "estrogen-detox", "impaired oestrogen")
    ) {
      labs.oestrogenDetoxImpaired = true;
    }

    if (isTerm(row, "snp") || mentions(blob, "snp")) {
      if (mentions(blob, "mthfr")) {
        labs.snpMthfr = true;
      }
      if (mentions(blob, "comt")) {
        labs.snpComtImpaired = true;
      }
      if (mentions(blob, "cyp1a1")) {
        labs.snpCyp1a1 = true;
      }
      if (mentions(blob, "cyp1b1")) {
        labs.snpCyp1b1 = true;
      }
    }

    if (mentions(blob, "inflammatory") || mentions(blob, "oxidative")) {
      labs.inflammatoryOxidativeBurden = true;
    }
  }

  return labs;
}
