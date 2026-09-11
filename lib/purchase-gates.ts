/**
 * Purchase safety gates for the Phase 3 store.
 *
 * canPurchase() MUST run at all three commerce checkpoints:
 * 1. Store / product detail — every "Add to cart" tap
 * 2. Cart load — re-check in case consent, thyroid, or plan status changed
 * 3. Checkout before Pay — only purchasable lines go to Payment Sheet
 *
 * Gates: consent (BRCA/CTC/SNP), iodine hard-stop, draft-plan block,
 * interaction amber flag (needs practitioner check).
 */
import type { ConsentFlags } from "@/lib/consent-flow";
import type { InterventionStatus } from "@/lib/plan";

/** Row shape from public.products — only fields the gates need. */
export type Product = {
  id?: string;
  product_type: "supplement" | "test";
  plain_name: string;
  plain_description?: string | null;
  clinical_name: string;
  linked_finding?: string | null;
  test_tier?: number | null;
  price: number;
  currency?: string;
  requires_consent?: boolean;
  interaction_flags?: string[] | null;
  active?: boolean;
};

/** Snapshot of user-specific facts for one purchase check. */
export type UserContext = {
  /** Phase 1 consent flags (brca / ctc / snp). */
  consent: ConsentFlags;
  /** From lab results when available; null = not entered yet. */
  thyroidAntibodiesPositive: boolean | null;
  /** From questionnaire comorbidities.autoimmune_thyroid. */
  autoimmuneThyroid: boolean;
  /** Contraceptive or HRT use — maps to hormone_therapy interaction flag. */
  hormoneTherapy: boolean;
  /** Blood-thinner use — maps to blood_thinners interaction flag. */
  bloodThinners: boolean;
  /** Plan rows that may block or flag a linked product. */
  linkedInterventions: LinkedIntervention[];
};

export type LinkedIntervention = {
  trigger_finding: string;
  status: InterventionStatus | string;
};

export type PurchaseGateResult = {
  allowed: boolean;
  blockReason?: string;
  needsCheck?: boolean;
};

const APPROVED_STATUSES = new Set<InterventionStatus | string>([
  "clinician_approved",
  "active",
]);

/** Map a consent-required test to the Phase 1 consent screen key. */
export function consentTypeForProduct(product: Product): keyof ConsentFlags | null {
  if (!product.requires_consent) {
    return null;
  }

  const name = product.clinical_name.toLowerCase();

  if (name.includes("brca")) {
    return "brca";
  }
  if (name.includes("circulating tumour") || name.includes("ctc")) {
    return "ctc";
  }
  if (name.includes("snp")) {
    return "snp";
  }

  return null;
}

/** Same iodine hard-stop as shouldOrderUrinaryIodine / mapResultsToInterventions. */
export function iodinePurchaseBlocked(context: UserContext): boolean {
  return (
    context.thyroidAntibodiesPositive === true || context.autoimmuneThyroid
  );
}

function isIodineProduct(product: Product): boolean {
  const clinical = product.clinical_name.toLowerCase();
  const linked = (product.linked_finding ?? "").toLowerCase();
  return clinical.includes("iodine") || linked.includes("iodine");
}

function interventionsForProduct(
  product: Product,
  context: UserContext,
): LinkedIntervention[] {
  if (!product.linked_finding) {
    return [];
  }

  return context.linkedInterventions.filter(
    (row) => row.trigger_finding === product.linked_finding,
  );
}

function draftPlanBlock(
  product: Product,
  context: UserContext,
): PurchaseGateResult | null {
  const matches = interventionsForProduct(product, context);
  if (matches.length === 0) {
    return null;
  }

  const hasDraft = matches.some((row) => row.status === "draft");
  if (!hasDraft) {
    return null;
  }

  const allApproved = matches.every((row) => APPROVED_STATUSES.has(row.status));
  if (allApproved) {
    return null;
  }

  return {
    allowed: false,
    blockReason:
      "This item is still pending practitioner review on your plan. You can order it once your clinician has approved that part of your plan.",
  };
}

function interactionGate(
  product: Product,
  context: UserContext,
): PurchaseGateResult | null {
  const flags = product.interaction_flags ?? [];
  if (flags.length === 0) {
    return null;
  }

  const needsHormoneCheck =
    flags.includes("hormone_therapy") && context.hormoneTherapy;
  const needsBloodThinnerCheck =
    flags.includes("blood_thinners") && context.bloodThinners;

  if (!needsHormoneCheck && !needsBloodThinnerCheck) {
    return null;
  }

  return {
    allowed: false,
    needsCheck: true,
    blockReason:
      "Because of your hormone therapy or blood-thinner answers, this needs a practitioner check before you can order it. Please review with your clinician first.",
  };
}

function consentGate(
  product: Product,
  context: UserContext,
): PurchaseGateResult | null {
  if (!product.requires_consent) {
    return null;
  }

  const consentType = consentTypeForProduct(product);
  if (!consentType) {
    return {
      allowed: false,
      blockReason:
        "This test needs a specific consent step before you can order it. Please contact support if you see this message.",
    };
  }

  if (context.consent[consentType]) {
    return null;
  }

  const label =
    consentType === "brca"
      ? "inherited risk gene (BRCA)"
      : consentType === "ctc"
        ? "early cell (CTC)"
        : "personal genetics (SNP)";

  return {
    allowed: false,
    blockReason: `Please complete the ${label} consent step before ordering this test.`,
  };
}

function iodineGate(
  product: Product,
  context: UserContext,
): PurchaseGateResult | null {
  if (!isIodineProduct(product)) {
    return null;
  }

  if (!iodinePurchaseBlocked(context)) {
    return null;
  }

  return {
    allowed: false,
    blockReason:
      "Iodine is not offered when thyroid antibodies are positive or you reported active autoimmune thyroid disease. Please speak with your clinician about thyroid care instead.",
  };
}

function inactiveProductGate(product: Product): PurchaseGateResult | null {
  if (product.active === false) {
    return {
      allowed: false,
      blockReason: "This item is not available in the store right now.",
    };
  }
  return null;
}

/**
 * Decide whether the user may add this product to cart.
 * Order: inactive → consent → iodine hard-stop → draft plan → interactions.
 */
export function canPurchase(
  product: Product,
  userContext: UserContext,
): PurchaseGateResult {
  const gates = [
    inactiveProductGate,
    consentGate,
    iodineGate,
    draftPlanBlock,
    interactionGate,
  ];

  for (const gate of gates) {
    const result = gate(product, userContext);
    if (result) {
      return result;
    }
  }

  return { allowed: true };
}

/**
 * Build hormoneTherapy from questionnaire facts (contraceptive OR HRT).
 * Re-exported helper so store screens use the same definition as the rules engine.
 */
export function hormoneTherapyFromFacts(input: {
  contraceptiveUse: boolean;
  hrtUse: boolean;
}): boolean {
  return input.contraceptiveUse || input.hrtUse;
}
