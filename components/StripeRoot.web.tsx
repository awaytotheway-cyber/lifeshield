import type { ReactNode } from "react";

type StripeRootProps = {
  children: ReactNode;
};

/**
 * Stripe's React Native SDK cannot load in the browser.
 * Checkout on web uses StripePayButton.web.tsx instead.
 */
export function StripeRoot({ children }: StripeRootProps) {
  return <>{children}</>;
}
