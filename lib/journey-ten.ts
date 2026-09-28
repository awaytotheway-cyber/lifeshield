/**
 * The 10-step PRESCOPE journey dashboard model.
 * Extends the existing 6-step "loop" (in lib/journey.ts) with three
 * behavioural steps (goals, barriers/strategies, social support) and
 * a final iterative-refinement step.
 *
 * Rendering is decoupled from the classic journey timeline on Home;
 * the new dashboard lives at (main)/(journey)/index.tsx.
 */

export type TenStepId =
  | "registration"
  | "baseline"
  | "test_recommendations"
  | "test_results"
  | "lifestyle_plan"
  | "goal_setting"
  | "habit_tracking"
  | "barriers_strategies"
  | "social_support"
  | "iterate";

export type TenStepState = "complete" | "current" | "upcoming";

export type TenStepMetric = { label: string; value: string };

export type TenStepInputs = {
  hasProfile: boolean;
  hasBaselineAnswers: boolean;
  hasRecommendations: boolean;
  hasLabResults: boolean;
  hasPlan: boolean;
  activeGoalCount: number;
  completedGoalCount: number;
  loggedActivityMinutes7d: number;
  triedBarrierCount: number;
  activeBuddyCount: number;
  weeksSinceStart: number;
};

export type TenStepRow = {
  id: TenStepId;
  title: string;
  body: string;
  state: TenStepState;
  href?: string;
  metrics: TenStepMetric[];
};

const STEP_ORDER: TenStepId[] = [
  "registration",
  "baseline",
  "test_recommendations",
  "test_results",
  "lifestyle_plan",
  "goal_setting",
  "habit_tracking",
  "barriers_strategies",
  "social_support",
  "iterate",
];

function isStepDone(id: TenStepId, i: TenStepInputs): boolean {
  switch (id) {
    case "registration":
      return i.hasProfile;
    case "baseline":
      return i.hasBaselineAnswers;
    case "test_recommendations":
      return i.hasRecommendations;
    case "test_results":
      return i.hasLabResults;
    case "lifestyle_plan":
      return i.hasPlan;
    case "goal_setting":
      return i.activeGoalCount > 0 || i.completedGoalCount > 0;
    case "habit_tracking":
      return i.loggedActivityMinutes7d >= 30;
    case "barriers_strategies":
      return i.triedBarrierCount > 0;
    case "social_support":
      return i.activeBuddyCount > 0;
    case "iterate":
      // "Iteration" is a soft milestone: reached once someone has moved
      // through the earlier loop at least once — plan + at least one goal
      // completed AND at least four weeks in.
      return i.hasPlan && i.completedGoalCount > 0 && i.weeksSinceStart >= 4;
  }
}

/** Return all 10 steps in order with computed state, copy, metrics, links. */
export function buildTenStepRows(
  i: TenStepInputs,
  copy: Record<string, string>,
  hrefs: Partial<Record<TenStepId, string>>,
): TenStepRow[] {
  let firstIncomplete: TenStepId | null = null;
  for (const id of STEP_ORDER) {
    if (!isStepDone(id, i)) {
      firstIncomplete = id;
      break;
    }
  }

  return STEP_ORDER.map<TenStepRow>((id) => {
    const done = isStepDone(id, i);
    const state: TenStepState = done
      ? "complete"
      : id === firstIncomplete
        ? "current"
        : "upcoming";
    return {
      id,
      title: copy[`journey10_${id}_title`] ?? id,
      body: copy[`journey10_${id}_body`] ?? "",
      state,
      href: hrefs[id],
      metrics: metricsFor(id, i),
    };
  });
}

function metricsFor(id: TenStepId, i: TenStepInputs): TenStepMetric[] {
  switch (id) {
    case "baseline":
      return [];
    case "goal_setting":
      return [
        { label: "Active", value: String(i.activeGoalCount) },
        { label: "Completed", value: String(i.completedGoalCount) },
      ];
    case "habit_tracking":
      return [{ label: "Minutes / 7d", value: String(i.loggedActivityMinutes7d) }];
    case "barriers_strategies":
      return [{ label: "Tried", value: String(i.triedBarrierCount) }];
    case "social_support":
      return [{ label: "Active buddies", value: String(i.activeBuddyCount) }];
    case "iterate":
      return [{ label: "Weeks in", value: String(i.weeksSinceStart) }];
    default:
      return [];
  }
}

export function completedCount(rows: TenStepRow[]): number {
  return rows.filter((r) => r.state === "complete").length;
}
