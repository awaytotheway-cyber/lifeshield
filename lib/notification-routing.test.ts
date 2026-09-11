import assert from "node:assert/strict";

import { hrefFromNotificationData } from "./notification-routing";

const symptomHref =
  "/(main)/(followup)/symptom-recheck?id=abc-123" as const;

assert.equal(
  hrefFromNotificationData({
    type: "symptom_check",
    followUpId: "abc-123",
  }),
  symptomHref,
);

assert.equal(
  hrefFromNotificationData({ type: "follow_up" }),
  "/(main)/(followup)",
);

assert.equal(
  hrefFromNotificationData({ type: "retest" }),
  "/(main)/(followup)",
);

assert.equal(
  hrefFromNotificationData({ type: "results_ready" }),
  "/(main)/(results)/lab-results",
);

assert.equal(
  hrefFromNotificationData({ type: "plan_approved" }),
  "/(main)/(plan)",
);

assert.equal(hrefFromNotificationData(undefined), null);
assert.equal(hrefFromNotificationData({}), null);

console.log("notification-routing.test.ts: ok");
