/**
 * The "where does this test stand?" note on each consent screen.
 *
 * The protocol asks that the evidence status of each test be made clear, with
 * an explicit "outside standard national screening guidelines" note. These are
 * statements of clinical fact shown to patients, so the wording below is a
 * DRAFT for clinician / governance sign-off, deliberately conservative, and
 * every line can be replaced from the admin app-copy table without a release
 * (keys: consent_evidence_<brca|ctc|snp>_label and _body).
 *
 * Pure: no React Native or Supabase import, so it is testable under tsx.
 */
import type { SequentialConsent } from "@/lib/consent-flow";

export const CONSENT_EVIDENCE_DEFAULTS: Record<
  SequentialConsent,
  { label: string; body: string }
> = {
  brca: {
    label: "Outside standard national screening guidelines",
    body: "Guidelines recommend inherited-risk gene testing for people whose family history or ancestry points to a higher chance. Without that, it is not part of standard national screening. A result should be talked through with a genetics professional.",
  },
  ctc: {
    label: "Outside standard national screening guidelines",
    body: "Circulating tumour cell tests are still being studied as a screening tool. They are not part of standard national screening, and they cannot rule cancer in or out.",
  },
  snp: {
    label: "Outside standard national screening guidelines",
    body: "This looks at common gene variants linked to how the body handles hormones and medicines. It is not part of standard national screening and it does not diagnose anything.",
  },
};

/** Said once on every consent screen, under the per-test note. */
export const CONSENT_EVIDENCE_NOT_A_REPLACEMENT =
  "This does not replace any screening you are invited to, such as mammography.";

export function consentEvidenceKey(
  type: SequentialConsent,
  part: "label" | "body",
): string {
  return `consent_evidence_${type}_${part}`;
}

/**
 * `resolve` is the app-copy lookup (key, fallback) -> text, so an edited row
 * in app_copy wins and the draft above is only the fallback.
 */
export function consentEvidenceFor(
  type: SequentialConsent,
  resolve: (key: string, fallback: string) => string,
): { label: string; body: string; footnote: string } {
  const defaults = CONSENT_EVIDENCE_DEFAULTS[type];
  return {
    label: resolve(consentEvidenceKey(type, "label"), defaults.label),
    body: resolve(consentEvidenceKey(type, "body"), defaults.body),
    footnote: resolve(
      "consent_evidence_footnote",
      CONSENT_EVIDENCE_NOT_A_REPLACEMENT,
    ),
  };
}
