import assert from "node:assert/strict";

import {
  ManualLabProvider,
  getActiveLabProvider,
  testNameForProductClinicalName,
} from "./lab-provider";

function testManualProviderCreatesPendingManual() {
  const provider = new ManualLabProvider();
  const result = provider.createOrder({
    userId: "user-1",
    storeOrderId: "order-1",
    orderItemId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    productClinicalName: "Fasting insulin",
    productTestTier: 3,
    testOrderId: null,
  });
  assert.equal(result.labProvider, "manual");
  assert.equal(result.status, "pending_manual");
  assert.ok(result.externalOrderId.startsWith("MANUAL-"));
}

function testClinicalNameMapping() {
  assert.equal(
    testNameForProductClinicalName("Fasting insulin"),
    "fastingInsulin",
  );
  assert.equal(
    testNameForProductClinicalName("BRCA1/2 genetic testing"),
    "brca",
  );
  assert.equal(testNameForProductClinicalName("Unknown panel"), null);
}

function testDefaultProviderIsManual() {
  const provider = getActiveLabProvider();
  assert.equal(provider.name, "manual");
}

testManualProviderCreatesPendingManual();
testClinicalNameMapping();
testDefaultProviderIsManual();

console.log("lab-provider.test.ts: all passed");
