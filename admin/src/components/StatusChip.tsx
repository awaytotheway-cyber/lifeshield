import type { ReactNode } from "react";

/**
 * Status chips for draft / approved / active and related ops states.
 * Visual only — does not change clinical meaning or allowed actions.
 */
export type StatusChipKind =
  | "draft"
  | "approved"
  | "active"
  | "declined"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "inactive";

type StatusChipProps = {
  kind: StatusChipKind;
  children: ReactNode;
};

export function StatusChip({ kind, children }: StatusChipProps) {
  return <span className={`ls-chip ls-chip--${kind}`}>{children}</span>;
}

export function interventionChipKind(status: string): StatusChipKind {
  switch (status) {
    case "draft":
      return "draft";
    case "clinician_approved":
      return "approved";
    case "active":
      return "active";
    case "declined":
      return "declined";
    default:
      return "inactive";
  }
}

export function interventionChipLabel(status: string): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "clinician_approved":
      return "Approved";
    case "active":
      return "Active";
    case "declined":
      return "Declined";
    default:
      return status;
  }
}

export function labOrderChipKind(status: string | undefined): StatusChipKind {
  switch (status) {
    case "pending_manual":
      return "draft";
    case "created":
    case "kit_dispatched":
    case "sample_received":
      return "info";
    case "processing":
      return "warning";
    case "resulted":
      return "success";
    case "cancelled":
      return "danger";
    default:
      return "inactive";
  }
}

export function paymentChipKind(status: string | undefined): StatusChipKind {
  switch (status) {
    case "paid":
      return "success";
    case "pending":
      return "warning";
    case "failed":
      return "danger";
    case "refunded":
      return "draft";
    default:
      return "inactive";
  }
}

export function fulfilmentChipKind(status: string | undefined): StatusChipKind {
  switch (status) {
    case "delivered":
    case "sample_collected":
      return "success";
    case "shipped":
    case "processing":
      return "info";
    case "awaiting_payment":
      return "warning";
    case "cancelled":
      return "danger";
    default:
      return "inactive";
  }
}

export function thresholdChipKind(status: string | undefined): StatusChipKind {
  if (status === "confirmed") {
    return "success";
  }
  if (status === "assumed") {
    return "warning";
  }
  return "inactive";
}

export function booleanActiveChip(
  active: boolean | undefined,
): { kind: StatusChipKind; label: string } {
  return active
    ? { kind: "active", label: "Active" }
    : { kind: "inactive", label: "Inactive" };
}
