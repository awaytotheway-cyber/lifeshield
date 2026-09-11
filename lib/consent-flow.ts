/**
 * BRCA → CTC → SNP must be agreed in this order before the questionnaire.
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

export function allConsentsAgreed(flags: ConsentFlags): boolean {
  return SEQUENTIAL_CONSENTS.every((key) => flags[key]);
}

/** First step that is not yet agreed, or null if all three are done. */
export function firstIncompleteConsent(
  flags: ConsentFlags,
): SequentialConsent | null {
  for (const key of SEQUENTIAL_CONSENTS) {
    if (!flags[key]) {
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
 * Returns null if this screen is the correct next step.
 */
export function redirectIfConsentOutOfOrder(
  screen: SequentialConsent,
  flags: ConsentFlags,
): Href | null {
  if (allConsentsAgreed(flags)) {
    return routes.questionnaire;
  }

  const next = firstIncompleteConsent(flags);
  if (!next) {
    return routes.questionnaire;
  }

  if (screen === next) {
    return null;
  }

  // Already agreed this one — skip forward to the first incomplete.
  if (flags[screen]) {
    return hrefForConsent(next);
  }

  // Trying to skip ahead — send back to the first incomplete.
  return hrefForConsent(next);
}
