/**
 * Lab ordering — provider interface + ManualLabProvider (Phase 4 Day 5).
 *
 * Real lab API keys never touch the phone. Production lab calls run in Edge
 * Functions with the service-role key. Until a lab contract is signed,
 * ManualLabProvider keeps fulfilment working via the admin panel.
 *
 * Switching to a live lab later = change getActiveLabProvider() to return
 * the real implementation (one-line swap).
 */
import { TERMS, type TermKey } from "@/lib/plain-language";

/** Rows stored in public.lab_orders.status */
export type LabOrderStatus =
  | "pending_manual"
  | "created"
  | "kit_dispatched"
  | "sample_received"
  | "processing"
  | "resulted"
  | "cancelled";

export const LAB_ORDER_STATUSES: LabOrderStatus[] = [
  "pending_manual",
  "created",
  "kit_dispatched",
  "sample_received",
  "processing",
  "resulted",
  "cancelled",
];

export type LabProviderName = "manual" | "live_stub";

/** One paid test line from the store — input to createOrder(). */
export type CreateLabOrderRequest = {
  userId: string;
  storeOrderId: string;
  orderItemId: string;
  productClinicalName: string;
  productTestTier: number | null;
  /** Matched public.test_orders row when the patient bought a recommended test. */
  testOrderId: string | null;
};

export type LabProviderCreateResult = {
  labProvider: string;
  externalOrderId: string;
  status: LabOrderStatus;
};

export interface LabProvider {
  readonly name: LabProviderName;
  /** Server-side only — creates the lab-side reference and initial status. */
  createOrder(request: CreateLabOrderRequest): LabProviderCreateResult;
  /** Poll status (live labs). Manual provider returns null — status lives in DB. */
  getStatus(_externalOrderId: string): LabOrderStatus | null;
}

/** Build medicalName → term key map from the plain-language dictionary. */
const CLINICAL_NAME_TO_TEST_NAME = new Map<string, TermKey>(
  Object.entries(TERMS).map(([key, entry]) => [
    entry.medicalName.trim().toLowerCase(),
    key as TermKey,
  ]),
);

/**
 * Map a catalog product's clinical_name to the rules-engine test_name key.
 * Returns null when we cannot match (admin can still fulfil manually).
 */
export function testNameForProductClinicalName(
  clinicalName: string,
): string | null {
  const normalized = clinicalName.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return CLINICAL_NAME_TO_TEST_NAME.get(normalized) ?? null;
}

/**
 * Internal fulfilment — no external lab API. Admin / clinic_staff move status
 * forward in the back-office panel until results are entered manually.
 */
export class ManualLabProvider implements LabProvider {
  readonly name: LabProviderName = "manual";

  createOrder(request: CreateLabOrderRequest): LabProviderCreateResult {
    const suffix = request.orderItemId.replace(/-/g, "").slice(0, 12);
    return {
      labProvider: "manual",
      externalOrderId: `MANUAL-${suffix}`,
      status: "pending_manual",
    };
  }

  getStatus(): LabOrderStatus | null {
    return null;
  }
}

/**
 * Placeholder for a future live lab integration. Not wired yet — throws if selected.
 */
export class LiveLabProviderStub implements LabProvider {
  readonly name: LabProviderName = "live_stub";

  createOrder(): LabProviderCreateResult {
    throw new Error(
      "Live lab provider is not configured yet. Keep ManualLabProvider active until a lab contract is signed.",
    );
  }

  getStatus(): LabOrderStatus | null {
    return null;
  }
}

const manualProvider = new ManualLabProvider();
const liveStubProvider = new LiveLabProviderStub();

/** Which provider is active. Override with EXPO_PUBLIC_LAB_PROVIDER=live_stub to test wiring. */
export function getActiveLabProviderName(): LabProviderName {
  const raw = (process.env.EXPO_PUBLIC_LAB_PROVIDER ?? "manual").trim().toLowerCase();
  if (raw === "live_stub") {
    return "live_stub";
  }
  return "manual";
}

export function getActiveLabProvider(): LabProvider {
  const name = getActiveLabProviderName();
  if (name === "live_stub") {
    return liveStubProvider;
  }
  return manualProvider;
}

/** Human-readable label for admin + order tracking copy. */
export function formatLabOrderStatus(status: string): string {
  switch (status) {
    case "pending_manual":
      return "Waiting for manual fulfilment";
    case "created":
      return "Lab order created";
    case "kit_dispatched":
      return "Sample kit dispatched";
    case "sample_received":
      return "Sample received at lab";
    case "processing":
      return "Processing at lab";
    case "resulted":
      return "Results ready";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}
