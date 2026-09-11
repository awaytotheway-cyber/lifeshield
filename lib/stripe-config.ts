/**
 * Stripe publishable key only — never put the secret key (sk_…) in the app.
 * The secret lives in Supabase Edge Function secrets (create-payment-intent).
 */
const PLACEHOLDER_PATTERNS = [
  /^pk_test_paste/i,
  /^pk_live_paste/i,
  /your_publishable_key/i,
  /paste_your/i,
];

/** Read EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY from the Expo env. */
export function readStripePublishableKey(): string {
  const raw = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  return raw;
}

/** True when a real-looking Stripe publishable key is in .env (not a placeholder). */
export function isStripePublishableKeyConfigured(): boolean {
  const key = readStripePublishableKey();
  if (!key) {
    return false;
  }
  if (!key.startsWith("pk_test_") && !key.startsWith("pk_live_")) {
    return false;
  }
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(key))) {
    return false;
  }
  if (key.length < 20) {
    return false;
  }
  return true;
}

/**
 * Stripe Payment Sheet needs a payment intent id for order rows.
 * Client secrets look like: pi_xxx_secret_yyy — we take the part before _secret_.
 */
export function paymentIntentIdFromClientSecret(clientSecret: string): string | null {
  const trimmed = clientSecret.trim();
  const marker = "_secret_";
  const index = trimmed.indexOf(marker);
  if (index <= 0) {
    return null;
  }
  const candidate = trimmed.slice(0, index);
  return candidate.startsWith("pi_") ? candidate : null;
}
