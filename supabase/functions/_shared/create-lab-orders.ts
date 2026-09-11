// Shared server logic for create-lab-order Edge Function + stripe-webhook.
// Service-role only — never import this from the mobile app.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

const CLINICAL_TO_TEST_NAME: Record<string, string> = {
  "brca1/2 genetic testing": "brca",
  "circulating tumour cell (ctc) test — liquid biopsy": "ctc",
  "snp risk-modification panel (buccal/saliva swab)": "snp",
  "routine bloods (baseline panel)": "routineBloods",
  "thyroid function (tsh, free t3, free t4) + antibodies (tpoab, tgab)": "thyroid",
  "active b12, folate, ferritin": "b12FolateFerritin",
  "fasting insulin": "fastingInsulin",
  "salivary cortisol (adrenal reserve)": "salivaryCortisol",
  "urinary iodine": "urinaryIodine",
  "stool beta-glucuronidase, microbial diversity & zonulin": "stool",
  "heavy metal exposure panel": "heavyMetals",
  "dutch — dried urine test for comprehensive hormones": "dutch",
  "cyp450 liver-enzyme functional assessment": "cyp450",
};

function testNameForClinicalName(clinicalName: string): string | null {
  const key = clinicalName.trim().toLowerCase();
  return CLINICAL_TO_TEST_NAME[key] ?? null;
}

type TestLineItem = {
  order_item_id: string;
  quantity: number;
  clinical_name: string;
  test_tier: number | null;
};

export type CreateLabOrdersResult = {
  created_count: number;
  lab_order_ids: string[];
};

/**
 * Idempotent: one lab_orders row per (store_order_id, order_item_id).
 * Uses ManualLabProvider semantics — status pending_manual, no external lab API.
 */
export async function createLabOrdersForStoreOrder(
  adminClient: SupabaseClient,
  storeOrderId: string,
): Promise<CreateLabOrdersResult> {
  const { data: order, error: orderError } = await adminClient
    .from("orders")
    .select("id, user_id, payment_status")
    .eq("id", storeOrderId)
    .maybeSingle();

  if (orderError) {
    throw orderError;
  }
  if (!order) {
    throw new Error("Store order not found.");
  }

  const userId = String(order.user_id);
  const paymentStatus = String(order.payment_status ?? "");
  if (paymentStatus !== "paid" && paymentStatus !== "pending") {
    return { created_count: 0, lab_order_ids: [] };
  }

  const { data: items, error: itemsError } = await adminClient
    .from("order_items")
    .select(
      "id, quantity, products!inner (clinical_name, test_tier, product_type)",
    )
    .eq("order_id", storeOrderId);

  if (itemsError) {
    throw itemsError;
  }

  const testLines: TestLineItem[] = [];
  for (const row of items ?? []) {
    const products = row.products as {
      clinical_name?: string;
      test_tier?: number | null;
      product_type?: string;
    } | null;
    if (!products || products.product_type !== "test") {
      continue;
    }
    testLines.push({
      order_item_id: String(row.id),
      quantity: Math.max(Number(row.quantity ?? 1), 1),
      clinical_name: String(products.clinical_name ?? ""),
      test_tier:
        products.test_tier === null || products.test_tier === undefined
          ? null
          : Number(products.test_tier),
    });
  }

  const createdIds: string[] = [];

  for (const line of testLines) {
    const { data: existing } = await adminClient
      .from("lab_orders")
      .select("id")
      .eq("store_order_id", storeOrderId)
      .eq("order_item_id", line.order_item_id)
      .maybeSingle();

    if (existing?.id) {
      continue;
    }

    const testName = testNameForClinicalName(line.clinical_name);
    let testOrderId: string | null = null;

    if (testName) {
      const { data: testOrders } = await adminClient
        .from("test_orders")
        .select("id, status, created_at")
        .eq("user_id", userId)
        .eq("test_name", testName)
        .in("status", ["recommended", "ordered"])
        .order("created_at", { ascending: true });

      for (const candidate of testOrders ?? []) {
        const { count } = await adminClient
          .from("lab_orders")
          .select("id", { count: "exact", head: true })
          .eq("test_order_id", candidate.id)
          .neq("status", "cancelled");

        if ((count ?? 0) === 0) {
          testOrderId = String(candidate.id);
          break;
        }
      }
    }

    const externalId = `MANUAL-${line.order_item_id.replace(/-/g, "")}`;

    const { data: inserted, error: insertError } = await adminClient
      .from("lab_orders")
      .insert({
        user_id: userId,
        store_order_id: storeOrderId,
        order_item_id: line.order_item_id,
        test_order_id: testOrderId,
        lab_provider: "manual",
        external_order_id: externalId,
        status: "pending_manual",
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      throw insertError;
    }

    createdIds.push(String(inserted.id));

    if (testOrderId) {
      await adminClient
        .from("test_orders")
        .update({ status: "ordered" })
        .eq("id", testOrderId)
        .eq("status", "recommended");
    }
  }

  return {
    created_count: createdIds.length,
    lab_order_ids: createdIds,
  };
}
