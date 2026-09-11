/**
 * Phase 3 Day 7 — Home journey current step (includes Order & track).
 * Run: npm run test:journey
 */
import assert from "node:assert/strict";

import {
  currentJourneyStep,
  isJourneyStepComplete,
  loopStepState,
  primaryJourneyAction,
  type JourneyProgress,
} from "./journey";

let passed = 0;

function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}

const base: JourneyProgress = {
  consentsDone: true,
  questionnaireCount: 10,
  hasRecommendations: true,
  hasLabResults: true,
  hasPlan: true,
  hasStoreOrders: true,
};

check("consents come first", () => {
  assert.equal(
    currentJourneyStep({ ...base, consentsDone: false, questionnaireCount: 0 }),
    "consents",
  );
});

check("walks Questionnaire → Tests → Results → Plan → Store → Follow-up", () => {
  assert.equal(
    currentJourneyStep({
      ...base,
      questionnaireCount: 3,
      hasRecommendations: false,
      hasLabResults: false,
      hasPlan: false,
      hasStoreOrders: false,
    }),
    "questionnaire",
  );
  assert.equal(
    currentJourneyStep({
      ...base,
      hasRecommendations: false,
      hasLabResults: false,
      hasPlan: false,
      hasStoreOrders: false,
    }),
    "tests",
  );
  assert.equal(
    currentJourneyStep({
      ...base,
      hasLabResults: false,
      hasPlan: false,
      hasStoreOrders: false,
    }),
    "results",
  );
  assert.equal(
    currentJourneyStep({ ...base, hasPlan: false, hasStoreOrders: false }),
    "plan",
  );
  assert.equal(
    currentJourneyStep({ ...base, hasStoreOrders: false }),
    "store",
  );
  assert.equal(currentJourneyStep(base), "followup");
});

check("lab results required before plan step", () => {
  assert.equal(
    currentJourneyStep({
      ...base,
      hasLabResults: false,
      hasPlan: false,
      hasStoreOrders: false,
    }),
    "results",
  );
});

check("completed milestones never show as waiting", () => {
  const progress: JourneyProgress = {
    ...base,
    hasStoreOrders: false,
  };
  assert.equal(isJourneyStepComplete("plan", progress), true);
  assert.equal(loopStepState("plan", "store", progress), "done");
  assert.equal(loopStepState("results", "store", progress), "done");
  assert.equal(loopStepState("store", "store", progress), "current");
});

check("highlights only the current loop step", () => {
  const beforePlan: JourneyProgress = {
    ...base,
    hasPlan: false,
    hasStoreOrders: false,
  };
  assert.equal(loopStepState("questionnaire", "results", beforePlan), "done");
  assert.equal(loopStepState("tests", "results", beforePlan), "done");
  assert.equal(loopStepState("results", "results", beforePlan), "current");
  assert.equal(loopStepState("plan", "results", beforePlan), "later");
  assert.equal(loopStepState("store", "results", beforePlan), "later");
  assert.equal(loopStepState("followup", "results", beforePlan), "later");
  const beforeConsents: JourneyProgress = {
    ...beforePlan,
    consentsDone: false,
    questionnaireCount: 0,
    hasRecommendations: false,
    hasLabResults: false,
  };
  assert.equal(loopStepState("questionnaire", "consents", beforeConsents), "later");
});

check("one primary action matches the current step", () => {
  assert.equal(primaryJourneyAction(base).titleKey, "homeOpenFollowUp");
  assert.equal(
    primaryJourneyAction({ ...base, hasStoreOrders: false }).titleKey,
    "homeOpenStore",
  );
  assert.equal(
    primaryJourneyAction({ ...base, hasPlan: false, hasStoreOrders: false })
      .titleKey,
    "homeOpenPlan",
  );
  assert.equal(
    primaryJourneyAction({
      ...base,
      hasLabResults: false,
      hasPlan: false,
      hasStoreOrders: false,
    }).href,
    "labResults",
  );
});

console.log(`\n${passed} checks passed`);
