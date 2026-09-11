import assert from "node:assert/strict";
import test from "node:test";

import {
  isStripePublishableKeyConfigured,
  paymentIntentIdFromClientSecret,
  readStripePublishableKey,
} from "./stripe-config";

test("paymentIntentIdFromClientSecret parses Stripe client secret", () => {
  const id = paymentIntentIdFromClientSecret("pi_abc123_secret_xyz");
  assert.equal(id, "pi_abc123");
});

test("paymentIntentIdFromClientSecret rejects invalid strings", () => {
  assert.equal(paymentIntentIdFromClientSecret(""), null);
  assert.equal(paymentIntentIdFromClientSecret("not_a_secret"), null);
});

test("isStripePublishableKeyConfigured rejects placeholders", () => {
  const original = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY =
    "pk_test_paste_your_publishable_key_here";
  assert.equal(isStripePublishableKeyConfigured(), false);
  if (original === undefined) {
    delete process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  } else {
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = original;
  }
});

test("readStripePublishableKey trims whitespace", () => {
  const original = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = "  pk_test_abc  ";
  assert.equal(readStripePublishableKey(), "pk_test_abc");
  if (original === undefined) {
    delete process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  } else {
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = original;
  }
});
