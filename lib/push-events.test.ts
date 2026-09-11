import assert from "node:assert/strict";

import {
  buildExpoPushMessages,
  chunkArray,
  isPushEventType,
} from "./push-events";

assert.equal(isPushEventType("results_ready"), true);
assert.equal(isPushEventType("plan_approved"), true);
assert.equal(isPushEventType("symptom_check"), false);

const resultsMessages = buildExpoPushMessages("results_ready", [
  "ExponentPushToken[abc]",
]);
assert.equal(resultsMessages.length, 1);
assert.equal(resultsMessages[0].to, "ExponentPushToken[abc]");
assert.equal(resultsMessages[0].data.type, "results_ready");
assert.equal(
  resultsMessages[0].data.href,
  "/(main)/(results)/lab-results",
);

const planMessages = buildExpoPushMessages("plan_approved", [
  "ExponentPushToken[xyz]",
]);
assert.equal(planMessages[0].data.type, "plan_approved");
assert.equal(planMessages[0].data.href, "/(main)/(plan)");

assert.deepEqual(chunkArray([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
assert.deepEqual(chunkArray([], 10), []);

console.log("push-events.test.ts: ok");
