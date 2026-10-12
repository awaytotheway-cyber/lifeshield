/**
 * Tier 1 escalation — BRCA1/2 and circulating tumour cell (CTC) results.
 *
 * The source protocol treats these two differently and this module keeps
 * that difference:
 *
 *   CTC positive  → "STOP PATHWAY IMMEDIATELY → flag for immediate
 *                   specialist referral." Preventative-arm testing pauses
 *                   pending specialist review, so the app locks the
 *                   questionnaire and downstream tabs the same way a
 *                   symptomatic triage answer does.
 *   BRCA positive → genetic counselling and a specialist breast-risk clinic
 *                   referral, "run in parallel with / instead of the SNP
 *                   risk-modification arm per specialist advice." That is a
 *                   referral and a clinician decision, NOT a hard stop, so
 *                   the app surfaces it prominently and keeps the pathway
 *                   open.
 *
 * Nothing here diagnoses. It routes.
 */
import type { TestResultRow } from "@/lib/test-results";

export type EscalationLevel = "none" | "brca_referral" | "ctc_stop";

export type EscalationState = {
  brcaPositive: boolean;
  ctcPositive: boolean;
  /** ctc_stop outranks brca_referral: a hard stop wins over a referral. */
  level: EscalationLevel;
};

export const NO_ESCALATION: EscalationState = {
  brcaPositive: false,
  ctcPositive: false,
  level: "none",
};

/**
 * Flags that mean "this came back positive".
 *
 * "critical" is included because an admin entering an unmistakably abnormal
 * Tier 1 result may reach for it before "positive"; treating it as negative
 * would silently drop an escalation. "high" is NOT included — it is a
 * quantitative flag with no meaning for a binary genetic or CTC result, and
 * accepting it would escalate on a mis-keyed numeric row.
 */
const POSITIVE_FLAGS = new Set(["positive", "critical"]);

function isPositive(row: TestResultRow): boolean {
  return POSITIVE_FLAGS.has((row.flag ?? "").trim().toLowerCase());
}

/** Term keys admin picks in the result-entry screen. */
function isTerm(row: TestResultRow, key: string): boolean {
  return row.test_name.trim().toLowerCase() === key;
}

export function escalationFromResults(
  rows: readonly TestResultRow[],
): EscalationState {
  let brcaPositive = false;
  let ctcPositive = false;

  for (const row of rows) {
    if (!isPositive(row)) {
      continue;
    }
    if (isTerm(row, "brca")) {
      brcaPositive = true;
    }
    if (isTerm(row, "ctc")) {
      ctcPositive = true;
    }
  }

  return {
    brcaPositive,
    ctcPositive,
    level: ctcPositive ? "ctc_stop" : brcaPositive ? "brca_referral" : "none",
  };
}
