import { COPY } from "@/lib/copy";
import type { InterventionCategory } from "@/lib/rules-engine";

export type PlanListItem = {
  id: string;
  category: InterventionCategory | string;
  trigger_finding: string;
};

export function reviewStatusLabel(status: string): string {
  if (status === "draft") {
    return COPY.planStatusDraft;
  }
  if (status === "clinician_approved" || status === "active") {
    return COPY.planStatusReviewed;
  }
  return COPY.planStatusPending;
}

export type PlanGroupKey =
  | "food"
  | "supplements"
  | "habits"
  | "followup"
  | "referrals";

export const PLAN_GROUP_ORDER: PlanGroupKey[] = [
  "habits",
  "food",
  "supplements",
  "followup",
  "referrals",
];

export function groupKeyForCategory(
  category: InterventionCategory | string,
): PlanGroupKey {
  switch (category) {
    case "diet":
      return "food";
    case "supplement":
      return "supplements";
    case "lifestyle":
    case "coaching":
      return "habits";
    case "therapy":
      return "followup";
    case "referral":
      return "referrals";
    default:
      return "habits";
  }
}

export function groupLabel(key: PlanGroupKey): string {
  switch (key) {
    case "food":
      return COPY.planGroupFood;
    case "supplements":
      return COPY.planGroupSupplements;
    case "habits":
      return COPY.planGroupHabits;
    case "followup":
      return COPY.planGroupFollowUp;
    case "referrals":
      return COPY.planGroupReferrals;
  }
}

/** Dictionary key so ClinicalTerm can show the exact finding. */
export function termKeyForFinding(finding: string): string | undefined {
  const text = finding.toLowerCase();
  if (text.includes("stool") || text.includes("dysbiosis") || text.includes("zonulin")) {
    return "stool";
  }
  if (text.includes("fasting insulin")) {
    return "fastingInsulin";
  }
  if (text.includes("thyroid")) {
    return "thyroid";
  }
  if (text.includes("cortisol") || text.includes("adrenal")) {
    return "salivaryCortisol";
  }
  if (text.includes("iodine")) {
    return "urinaryIodine";
  }
  if (text.includes("methylation") || text.includes("mthfr")) {
    return "mthfr";
  }
  if (text.includes("oestrogen") || text.includes("estrogen") || text.includes("dutch")) {
    return "dutch";
  }
  if (text.includes("toxin") || text.includes("heavy")) {
    return "heavyMetals";
  }
  return undefined;
}

export function groupInterventions<T extends PlanListItem>(rows: T[]): {
  key: PlanGroupKey;
  label: string;
  items: T[];
}[] {
  const buckets = new Map<PlanGroupKey, T[]>();
  for (const row of rows) {
    const key = groupKeyForCategory(row.category);
    const existing = buckets.get(key) ?? [];
    existing.push(row);
    buckets.set(key, existing);
  }
  return PLAN_GROUP_ORDER.filter((key) => (buckets.get(key)?.length ?? 0) > 0).map(
    (key) => ({
      key,
      label: groupLabel(key),
      items: buckets.get(key) ?? [],
    }),
  );
}
