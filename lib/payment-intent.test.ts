import assert from "node:assert/strict";
import test from "node:test";

import { COPY } from "./copy";
import { formatPaymentIntentSuccessMessage } from "./payment-intent-format";

test("formatPaymentIntentSuccessMessage shows INR total", () => {
  const message = formatPaymentIntentSuccessMessage(1299, "inr");
  assert.equal(
    message,
    COPY.checkoutServerTotalSuccess.replace("{amount}", "₹1,299"),
  );
  assert.match(message, /Payment Sheet/i);
});

test("formatPaymentIntentSuccessMessage handles non-INR currency", () => {
  const message = formatPaymentIntentSuccessMessage(42.5, "usd");
  assert.match(message, /USD/);
});
