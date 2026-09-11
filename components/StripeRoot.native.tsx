import type { ReactNode } from "react";
import { StripeProvider } from "@stripe/stripe-react-native";

import {
  isStripePublishableKeyConfigured,
  readStripePublishableKey,
} from "@/lib/stripe-config";

type StripeRootProps = {
  children: ReactNode;
};

/**
 * Wraps the native app in StripeProvider when a publishable key is configured.
 * Without a key, children still render so checkout can show setup instructions.
 */
export function StripeRoot({ children }: StripeRootProps) {
  if (!isStripePublishableKeyConfigured()) {
    return <>{children}</>;
  }

  return (
    <StripeProvider publishableKey={readStripePublishableKey()}>
      <>{children}</>
    </StripeProvider>
  );
}
