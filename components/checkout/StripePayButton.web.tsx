import type { CartLineRow } from "@/lib/store";

type StripePayButtonProps = {
  disabled: boolean;
  userId: string;
  lines: CartLineRow[];
  onError: (message: string) => void;
  onSuccess: (orderId: string) => void;
};

/** Web stub — Payment Sheet is native-only. */
export function StripePayButton(_props: StripePayButtonProps) {
  return null;
}

export function formatCheckoutServerHint(): string {
  return "";
}
