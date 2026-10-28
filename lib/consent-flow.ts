/**
 * BRCA → CTC → SNP are asked in this order, and each must be DECIDED before
 * the questionnaire opens. Decided means the patient answered, yes or no.
 *
 * Two different questions use these flags, and they must not be confused:
 *
 *   decided — "has this person been asked and answered?"  Gates the pathway.
 *   agreed  — "did they say yes?"  Gates anything that needs the consent
 *             itself, such as buying a SNP kit (lib/purchase-gates.ts).
 *
 * The protocol makes each test the patient's choice: BRCA is offered and the
 * patient "may decline", CTC is "if desired", and the pathway moves on once
 * BRCA and CTC are "completed or actively declined". Gating on agreed would
 * make consent a condition of using the app, so declining any one test would
 * strand the patient with no questionnaire, Tests, plan or follow-up.
 */
import type { Href } from "expo-router";

import { routes } from "@/lib/routes";

export const SEQUENTIAL_CONSENTS = ["brca", "ctc", "snp"] as const;

export type SequentialConsent = (typeof SEQUENTIAL_CONSENTS)[number];

export type ConsentFlags = Record<SequentialConsent, boolean>;

export const emptyConsentFlags: ConsentFlags = {
  brca: false,
  ctc: false,
  snp: false,
};

export type ConsentRow = { consent_type: string; consented: boolean };

/**
 * Folds consent rows into agreed and decided flags. There is one row per
 * decision, so a row means decided and `consented` says which way; no row
 * means the patient has not been asked yet. Rows arrive oldest-first, so the
 * latest decision for a type wins when someone has changed their mind.
 *
 * A failed load (null) returns nothing decided. That fails closed: the
 * patient is sent back to the consent screens rather than waved through.
 */
export function foldConsentRows(rows: readonly ConsentRow[] | null): {
  agreed: ConsentFlags;
  decided: ConsentFlags;
} {
  const agreed: ConsentFlags = { ...emptyConsentFlags };
  const decided: ConsentFlags = { ...emptyConsentFlags };
  if (!rows) {
    return { agreed, decided };
  }
  for (const row of rows) {
    if (
      row.consent_type === "brca" ||
      row.consent_type === "ctc" ||
      row.consent_type === "snp"
    ) {
      agreed[row.consent_type] = Boolean(row.consented);
      decided[row.consent_type] = true;
    }
  }
  return { agreed, decided };
}

/** True once every consent has been answered, whichever way. */
export function allConsentsDecided(decided: ConsentFlags): boolean {
  return SEQUENTIAL_CONSENTS.every((key) => decided[key]);
}

/** First consent not yet answered, or null if all three are decided. */
export function firstUndecidedConsent(
  decided: ConsentFlags,
): SequentialConsent | null {
  for (const key of SEQUENTIAL_CONSENTS) {
    if (!decided[key]) {
      return key;
    }
  }
  return null;
}

export function hrefForConsent(type: SequentialConsent): Href {
  if (type === "brca") {
    return routes.consentBrca;
  }
  if (type === "ctc") {
    return routes.consentCtc;
  }
  return routes.consentSnp;
}

export function hrefAfterConsent(type: SequentialConsent): Href {
  if (type === "brca") {
    return routes.consentCtc;
  }
  if (type === "ctc") {
    return routes.consentSnp;
  }
  return routes.questionnaire;
}

/**
 * Where to send someone who is on a consent screen they should not see yet.
 * Returns null if this screen is the correct one to show.
 *
 * The order is enforced only while consents are still being decided. Once all
 * three are decided any consent screen may be revisited, because a decision
 * the patient can never change is not a choice. That is the route back for
 * someone who declined and later wants to agree.
 */
export function redirectIfConsentOutOfOrder(
  screen: SequentialConsent,
  decided: ConsentFlags,
): Href | null {
  const next = firstUndecidedConsent(decided);
  if (!next) {
    return null;
  }

  if (screen === next) {
    return null;
  }

  // Already decided this one, or trying to skip ahead: go to the first
  // consent that is still waiting for an answer.
  return hrefForConsent(next);
}
