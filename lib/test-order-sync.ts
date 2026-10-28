/**
 * Works out what to write so `test_orders` matches the engine's list without
 * disturbing an order that has already moved on.
 *
 * Only rows still "recommended" may be changed or removed. Anything else
 * ("ordered" after a purchase, then completed or cancelled) belongs to the
 * fulfilment flow; it counts as present, so the same test is never recommended
 * a second time on top of it.
 *
 * `removeStale: false` is the early write when the pathway opens (Tier 3 only,
 * insert what is missing). `removeStale: true` is the full sync after the
 * questionnaire, which also drops recommendations that no longer apply.
 *
 * Pure: no Supabase import, so it can be tested under tsx.
 */
export type WantedOrder = {
  test_tier: 1 | 2 | 3 | 4;
  test_name: string;
  trigger_reason: string;
};

export type ExistingOrder = {
  id: string;
  test_name: string;
  test_tier: number;
  status: string | null;
  trigger_reason: string | null;
};

export type OrderSyncPlan = {
  insert: WantedOrder[];
  update: { id: string; trigger_reason: string }[];
  remove: string[];
};

const RECOMMENDED = "recommended";

export function planOrderSync(
  existing: readonly ExistingOrder[],
  wanted: readonly WantedOrder[],
  options: {
    removeStale: boolean;
    /**
     * Only these tiers are considered: other rows are invisible and other
     * wishes are ignored. Lets Tier 1 and Tier 3/4 sync independently.
     */
    tiers?: readonly number[];
  },
): OrderSyncPlan {
  const plan: OrderSyncPlan = { insert: [], update: [], remove: [] };
  const inScope = (tier: number) => !options.tiers || options.tiers.includes(tier);
  existing = existing.filter((row) => inScope(row.test_tier));
  wanted = wanted.filter((order) => inScope(order.test_tier));

  const wantedByName = new Map<string, WantedOrder>();
  for (const order of wanted) {
    if (!wantedByName.has(order.test_name)) {
      wantedByName.set(order.test_name, order);
    }
  }

  const present = new Set<string>();
  for (const row of existing) {
    if ((row.status ?? RECOMMENDED) !== RECOMMENDED) {
      present.add(row.test_name);
    }
  }

  for (const row of existing) {
    if ((row.status ?? RECOMMENDED) !== RECOMMENDED) {
      continue;
    }
    const target = wantedByName.get(row.test_name);
    if (!target || present.has(row.test_name)) {
      // Not wanted any more, or a duplicate of a test already in hand.
      if (options.removeStale) {
        plan.remove.push(row.id);
      }
      continue;
    }
    present.add(row.test_name);
    if (row.trigger_reason !== target.trigger_reason) {
      plan.update.push({ id: row.id, trigger_reason: target.trigger_reason });
    }
  }

  for (const order of wantedByName.values()) {
    if (!present.has(order.test_name)) {
      plan.insert.push(order);
    }
  }

  return plan;
}
