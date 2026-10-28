/**
 * Phase 3 Day 1 — unit checks for canPurchase().
 *
 * Run from the project folder:
 *   npm run test:purchase-gates
 *
 * No extra test framework is installed. This file throws if a check fails.
 */
import assert from "node:assert/strict";
import { emptyConsentFlags } from "./consent-flow";
import {
  canPurchase,
  type Product,
  type UserContext,
} from "./purchase-gates";

let passed = 0;

function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}

const brcaTest: Product = {
  product_type: "test",
  plain_name: "Inherited risk gene check",
  clinical_name: "BRCA1/2 genetic testing",
  price: 24999,
  requires_consent: true,
};

const iodineSupplement: Product = {
  product_type: "supplement",
  plain_name: "Iodine supplement",
  clinical_name: "Iodine supplementation (blocked if antibodies positive)",
  linked_finding: "Low urinary iodine (antibodies NEGATIVE)",
  price: 599,
};

const dimProduct: Product = {
  product_type: "supplement",
  plain_name: "DIM / I3C",
  clinical_name: "DIM/I3C",
  linked_finding: "Impaired oestrogen-detoxification (SNP/DUTCH)",
  price: 1299,
  interaction_flags: ["hormone_therapy", "blood_thinners"],
};

const calciumProduct: Product = {
  product_type: "supplement",
  plain_name: "Calcium-D-glucarate",
  clinical_name: "Calcium-D-glucarate",
  linked_finding: "Raised stool beta-glucuronidase",
  price: 1299,
};

function baseContext(partial: Partial<UserContext> = {}): UserContext {
  return {
    consent: { ...emptyConsentFlags },
    thyroidAntibodiesPositive: null,
    autoimmuneThyroid: false,
    hormoneTherapy: false,
    bloodThinners: false,
    thyroidMedication: false,
    linkedInterventions: [],
    ...partial,
  };
}

check("consent missing blocks BRCA product", () => {
  const result = canPurchase(brcaTest, baseContext());
  assert.equal(result.allowed, false);
  assert.ok(result.blockReason?.toLowerCase().includes("consent"));
  assert.notEqual(result.needsCheck, true);
});

check("iodine blocked when thyroid antibodies are positive", () => {
  const result = canPurchase(
    iodineSupplement,
    baseContext({ thyroidAntibodiesPositive: true }),
  );
  assert.equal(result.allowed, false);
  assert.ok(result.blockReason?.toLowerCase().includes("iodine"));
  assert.notEqual(result.needsCheck, true);
});

// The protocol says iodine is "only if thyroid antibodies negative" — a known
// state. The plan engine already requires a measured negative; the store must
// agree, or iodine is drafted by no one and still sold to anyone untested.
const approvedIodinePlan = [
  {
    trigger_finding: "Low urinary iodine (antibodies NEGATIVE)",
    status: "clinician_approved",
  },
];

check("iodine blocked when thyroid antibodies were never measured", () => {
  const result = canPurchase(
    iodineSupplement,
    baseContext({
      thyroidAntibodiesPositive: null,
      linkedInterventions: approvedIodinePlan,
    }),
  );
  assert.equal(result.allowed, false);
  assert.ok(result.blockReason?.toLowerCase().includes("iodine"));
  assert.ok(result.blockReason?.toLowerCase().includes("antibod"));
});

check("iodine allowed once thyroid antibodies are measured negative", () => {
  const result = canPurchase(
    iodineSupplement,
    baseContext({
      thyroidAntibodiesPositive: false,
      linkedInterventions: approvedIodinePlan,
    }),
  );
  assert.deepEqual(result, { allowed: true });
});

check("iodine stays blocked by an autoimmune thyroid diagnosis even with negative antibodies", () => {
  const result = canPurchase(
    iodineSupplement,
    baseContext({
      thyroidAntibodiesPositive: false,
      autoimmuneThyroid: true,
      linkedInterventions: approvedIodinePlan,
    }),
  );
  assert.equal(result.allowed, false);
});

check("unknown antibodies do not block products that are not iodine", () => {
  const result = canPurchase(
    calciumProduct,
    baseContext({
      thyroidAntibodiesPositive: null,
      linkedInterventions: [
        {
          trigger_finding: "Raised stool beta-glucuronidase",
          status: "clinician_approved",
        },
      ],
    }),
  );
  assert.deepEqual(result, { allowed: true });
});

check("DIM flagged when contraceptive counts as hormone therapy", () => {
  const result = canPurchase(
    dimProduct,
    baseContext({
      hormoneTherapy: true,
      linkedInterventions: [
        {
          trigger_finding: "Impaired oestrogen-detoxification (SNP/DUTCH)",
          status: "clinician_approved",
        },
      ],
    }),
  );
  assert.equal(result.allowed, false);
  assert.equal(result.needsCheck, true);
  assert.ok(result.blockReason?.toLowerCase().includes("practitioner"));
});

check("draft intervention blocks purchase", () => {
  const result = canPurchase(
    calciumProduct,
    baseContext({
      linkedInterventions: [
        {
          trigger_finding: "Raised stool beta-glucuronidase",
          status: "draft",
        },
      ],
    }),
  );
  assert.equal(result.allowed, false);
  assert.ok(result.blockReason?.toLowerCase().includes("pending"));
  assert.notEqual(result.needsCheck, true);
});

check("happy path when consent, plan, iodine, and interactions are clear", () => {
  const result = canPurchase(
    calciumProduct,
    baseContext({
      linkedInterventions: [
        {
          trigger_finding: "Raised stool beta-glucuronidase",
          status: "clinician_approved",
        },
      ],
    }),
  );
  assert.deepEqual(result, { allowed: true });
});

check("active intervention status also allows purchase", () => {
  const result = canPurchase(
    calciumProduct,
    baseContext({
      linkedInterventions: [
        {
          trigger_finding: "Raised stool beta-glucuronidase",
          status: "active",
        },
      ],
    }),
  );
  assert.deepEqual(result, { allowed: true });
});

check("BRCA allowed when matching consent is recorded", () => {
  const result = canPurchase(
    brcaTest,
    baseContext({
      consent: { brca: true, ctc: false, snp: false },
    }),
  );
  assert.deepEqual(result, { allowed: true });
});

const thyroidSensitive: Product = {
  product_type: "supplement",
  plain_name: "Thyroid-sensitive item",
  clinical_name: "Example product tagged for thyroid medication",
  linked_finding: "Raised stool beta-glucuronidase",
  price: 1299,
  interaction_flags: ["thyroid_medication"],
};

check("a product tagged for thyroid medication needs a check for someone on it", () => {
  const result = canPurchase(thyroidSensitive, baseContext({ thyroidMedication: true }));
  assert.equal(result.allowed, false);
  assert.equal(result.needsCheck, true);
});

check("the same product is not held back for someone not on thyroid medication", () => {
  const result = canPurchase(thyroidSensitive, baseContext({ thyroidMedication: false }));
  assert.equal(result.needsCheck, undefined);
});

check("thyroid medication alone does not hold back a product with no such tag", () => {
  const result = canPurchase(calciumProduct, baseContext({ thyroidMedication: true }));
  assert.equal(result.needsCheck, undefined);
});

console.log(`\n${passed} checks passed.`);
