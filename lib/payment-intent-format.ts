/**
 * Pure helpers for showing payment totals — safe to unit test without React Native.
 */
import { COPY } from "@/lib/copy";

export function formatPaymentTotalForDisplay(
  total: number,
  currency: string,
): string {
  const code = currency.toUpperCase();
  if (code === "INR") {
    return `₹${total.toLocaleString("en-IN")}`;
  }
  return `${code} ${total.toLocaleString()}`;
}

/** User-facing line after a successful Day 4 test. */
export function formatPaymentIntentSuccessMessage(
  total: number,
  currency: string,
): string {
  return COPY.checkoutServerTotalSuccess.replace(
    "{amount}",
    formatPaymentTotalForDisplay(total, currency),
  );
}
