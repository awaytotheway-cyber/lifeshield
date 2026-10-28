/**
 * Tier 1 ordering, as the protocol words it:
 *
 *   BRCA1/2 — "If Indicated & Consented: Order".
 *   CTC     — "If Consented: Order".
 *
 * "Indicated" is ethnicity and/or a BRCA-positive relative. Anything unknown
 * is not indicated: a test is never ordered on a guess. The ethnicities that
 * count are a clinical fact for the clinicians to supply, so the list ships
 * empty and, until it is filled, only a BRCA-positive relative indicates.
 *
 * SNP is a home-kit dispatch with its own flow and is not a Tier 1 order.
 *
 * Pure: no React Native or Supabase import.
 */
import type { ConsentFlags } from "@/lib/consent-flow";
import type { WantedOrder } from "@/lib/test-order-sync";

/** Ethnicity option values that indicate BRCA testing. Clinician-supplied. */
export const BRCA_INDICATED_ETHNICITIES: readonly string[] = [];

/**
 * true  — indicated
 * false — answered, and not indicated
 * null  — cannot tell yet (the relative question is unanswered or "not sure")
 */
export function brcaIndicated(
  input: { brcaPositiveRelative: boolean | null; ethnicity: string | null },
  ethnicities: readonly string[] = BRCA_INDICATED_ETHNICITIES,
): boolean | null {
  if (input.brcaPositiveRelative === true) {
    return true;
  }
  const ethnicity = (input.ethnicity ?? "").trim().toLowerCase();
  if (ethnicity && ethnicities.some((item) => item.trim().toLowerCase() === ethnicity)) {
    return true;
  }
  if (input.brcaPositiveRelative === false) {
    return false;
  }
  return null;
}

export function tier1Orders(input: {
  agreed: ConsentFlags;
  indicated: boolean | null;
}): WantedOrder[] {
  const orders: WantedOrder[] = [];
  if (input.agreed.brca && input.indicated === true) {
    orders.push({
      test_tier: 1,
      test_name: "brca",
      trigger_reason:
        "You agreed to BRCA1/2 testing, and a BRCA-positive relative (or ethnicity) points to it being indicated.",
    });
  }
  if (input.agreed.ctc) {
    orders.push({
      test_tier: 1,
      test_name: "ctc",
      trigger_reason: "You agreed to the circulating tumour cell (CTC) test.",
    });
  }
  return orders;
}
