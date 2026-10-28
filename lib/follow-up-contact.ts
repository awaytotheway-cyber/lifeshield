/**
 * The steps in front of completing a follow-up.
 *
 * Symptoms are re-checked at every follow-up contact, and consent status is
 * documented at each review. The scheduled symptom re-check is itself the
 * question, so it has no step in front of it.
 *
 * Pure: no React Native or Supabase import.
 */
import {
  SEQUENTIAL_CONSENTS,
  type ConsentFlags,
} from "@/lib/consent-flow";

export type ContactStep = "symptom" | "consents";

export function contactStepsFor(type: string): ContactStep[] {
  if (type === "symptom_check") {
    return [];
  }
  if (type === "review") {
    return ["symptom", "consents"];
  }
  return ["symptom"];
}

/** The first step not yet done, in order. Later steps never count early. */
export function nextContactStep(
  type: string,
  done: readonly ContactStep[],
): ContactStep | null {
  for (const step of contactStepsFor(type)) {
    if (!done.includes(step)) {
      return step;
    }
  }
  return null;
}

/**
 * One line recording what each consent was at this review, written onto the
 * completed review row so there is a dated record without a new table.
 */
export function consentSnapshotNote(
  agreed: ConsentFlags,
  decided: ConsentFlags,
  isoDate: string,
): string {
  const parts = SEQUENTIAL_CONSENTS.map((type) => {
    const name = type.toUpperCase();
    if (!decided[type]) {
      return `${name} not answered`;
    }
    return `${name} ${agreed[type] ? "agreed" : "declined"}`;
  });
  return `Consents at review (${isoDate}): ${parts.join(", ")}.`;
}

/**
 * Which contacts have answered the symptom question in this session. In
 * memory on purpose: if the app restarts mid-flow the question is simply asked
 * again, which is the safe direction. It stops a later step being opened
 * directly with the symptom question skipped.
 */
const symptomChecked = new Set<string>();

export function markSymptomChecked(followUpId: string): void {
  symptomChecked.add(followUpId);
}

export function wasSymptomChecked(followUpId: string): boolean {
  return symptomChecked.has(followUpId);
}

export function clearSymptomChecked(followUpId: string): void {
  symptomChecked.delete(followUpId);
}
