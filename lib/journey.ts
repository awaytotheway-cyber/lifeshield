/**
 * Home journey: one glance at the closed loop, one current step.
 * Safety check is already done if this screen is visible.
 *
 * Phase 3 adds Order & track between Plan and Follow-up.
 */

export type JourneyStepId =
  | "consents"
  | "questionnaire"
  | "tests"
  | "results"
  | "plan"
  | "store"
  | "followup";

export type JourneyRowState = "done" | "current" | "later";

export type JourneyProgress = {
  consentsDone: boolean;
  questionnaireCount: number;
  hasRecommendations: boolean;
  hasLabResults: boolean;
  hasPlan: boolean;
  hasStoreOrders: boolean;
};

export type JourneyAction = {
  step: JourneyStepId;
  titleKey:
    | "homeContinueConsents"
    | "homeOpenQuestionnaire"
    | "homeOpenResults"
    | "homeOpenLabResults"
    | "homeOpenPlan"
    | "homeOpenStore"
    | "homeOpenOrders"
    | "homeOpenFollowUp";
  href:
    | "consent"
    | "questionnaire"
    | "results"
    | "labResults"
    | "plan"
    | "store"
    | "orders"
    | "followUp";
};

const LOOP_STEPS: JourneyStepId[] = [
  "questionnaire",
  "tests",
  "results",
  "plan",
  "store",
  "followup",
];

/** True when the user has finished this milestone (never "Waiting" once done). */
export function isJourneyStepComplete(
  step: JourneyStepId,
  progress: JourneyProgress,
): boolean {
  switch (step) {
    case "consents":
      return progress.consentsDone;
    case "questionnaire":
      return progress.questionnaireCount >= 10;
    case "tests":
      return progress.hasRecommendations;
    case "results":
      return progress.hasLabResults;
    case "plan":
      return progress.hasPlan;
    case "store":
      return progress.hasStoreOrders;
    case "followup":
      return false;
  }
}

export function currentJourneyStep(progress: JourneyProgress): JourneyStepId {
  if (!progress.consentsDone) {
    return "consents";
  }
  if (progress.questionnaireCount < 10) {
    return "questionnaire";
  }
  if (!progress.hasRecommendations) {
    return "tests";
  }
  if (!progress.hasPlan) {
    if (!progress.hasLabResults) {
      return "results";
    }
    return "plan";
  }
  if (!progress.hasStoreOrders) {
    return "store";
  }
  return "followup";
}

export function loopStepState(
  step: JourneyStepId,
  current: JourneyStepId,
  progress?: JourneyProgress,
): JourneyRowState {
  if (step === current) {
    return "current";
  }

  if (progress && isJourneyStepComplete(step, progress)) {
    return "done";
  }

  if (current === "consents") {
    return "later";
  }

  const currentIndex = LOOP_STEPS.indexOf(current);
  const stepIndex = LOOP_STEPS.indexOf(step);
  if (stepIndex < 0 || currentIndex < 0) {
    return "later";
  }
  if (stepIndex < currentIndex) {
    return "done";
  }
  return "later";
}

export function primaryJourneyAction(
  progress: JourneyProgress,
): JourneyAction {
  const step = currentJourneyStep(progress);
  switch (step) {
    case "consents":
      return { step, titleKey: "homeContinueConsents", href: "consent" };
    case "questionnaire":
      return { step, titleKey: "homeOpenQuestionnaire", href: "questionnaire" };
    case "tests":
      return { step, titleKey: "homeOpenResults", href: "results" };
    case "results":
      return { step, titleKey: "homeOpenLabResults", href: "labResults" };
    case "plan":
      return { step, titleKey: "homeOpenPlan", href: "plan" };
    case "store":
      return { step, titleKey: "homeOpenStore", href: "store" };
    case "followup":
      return { step, titleKey: "homeOpenFollowUp", href: "followUp" };
  }
}
