/**
 * Plain labels for where a patient's plan is in the clinician review journey.
 * Used by the Plan tab banner and title — not purchase gates (see purchase-gates.ts).
 */
import { COPY } from "@/lib/copy";

export type PlanReviewState = "empty" | "draft" | "approved_pending" | "finalised";

export type PlanRowForState = {
  status: string;
};

/** Work out which banner/title to show from intervention statuses. */
export function planReviewState(rows: PlanRowForState[]): PlanReviewState {
  if (rows.length === 0) {
    return "empty";
  }

  const hasActive = rows.some((row) => row.status === "active");
  if (hasActive) {
    return "finalised";
  }

  const hasApproved = rows.some((row) => row.status === "clinician_approved");
  const hasDraft = rows.some((row) => row.status === "draft");

  if (hasApproved && !hasDraft) {
    return "approved_pending";
  }

  return "draft";
}

export function planTitleForState(state: PlanReviewState): string {
  switch (state) {
    case "finalised":
      return COPY.planTitleFinalised;
    case "approved_pending":
      return COPY.planTitleApproved;
    default:
      return COPY.planTitle;
  }
}

export function planBannerForState(state: PlanReviewState): string {
  switch (state) {
    case "finalised":
      return COPY.planBannerFinalised;
    case "approved_pending":
      return COPY.planBannerApproved;
    default:
      return COPY.planBanner;
  }
}
