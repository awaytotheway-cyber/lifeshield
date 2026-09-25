/**
 * Supabase reads and writes for Phase F — genetic tests catalogue and
 * per-user orders. Kept small on purpose; the interesting logic lives in
 * the future partner webhook + rules-engine ingestion, both waiting on a
 * signed contract.
 */
import { messageFromUnknown, rawErrorText } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const REQUEST_TIMEOUT_MS = 15_000;

function withTimeout<T>(
  promise: PromiseLike<T>,
  label: string,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function looksLikeMissingTable(error: unknown): boolean {
  const text = rawErrorText(error).toLowerCase();
  return (
    text.includes("genetic_tests") &&
    (text.includes("does not exist") ||
      text.includes("relation") ||
      text.includes("not found"))
  );
}

// ---------- Catalogue ----------

export type GeneticSampleType =
  | "saliva"
  | "buccal_swab"
  | "blood_dbs"
  | "stool"
  | "other";

export type GeneticTestRow = {
  id: string;
  provider_code: string;
  name: string;
  description: string | null;
  sample_type: GeneticSampleType;
  price: number | null;
  currency: string;
  turnaround_days: number | null;
  panel_details: Record<string, unknown>;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const TEST_COLUMNS =
  "id, provider_code, name, description, sample_type, price, currency, turnaround_days, panel_details, active, created_at, updated_at";

function toTest(raw: Record<string, unknown>): GeneticTestRow {
  return {
    id: raw.id as string,
    provider_code: (raw.provider_code as string) ?? "manual",
    name: raw.name as string,
    description: (raw.description as string | null) ?? null,
    sample_type: (raw.sample_type as GeneticSampleType) ?? "other",
    price: (raw.price as number | null) ?? null,
    currency: (raw.currency as string) ?? "INR",
    turnaround_days: (raw.turnaround_days as number | null) ?? null,
    panel_details:
      (raw.panel_details as Record<string, unknown>) ?? {},
    active: Boolean(raw.active),
    created_at: raw.created_at as string,
    updated_at: raw.updated_at as string,
  };
}

export type LoadTestsOutcome =
  | { ok: true; rows: GeneticTestRow[] }
  | { ok: false; rows: []; message: string; missingTable?: boolean };

export async function loadActiveGeneticTests(): Promise<LoadTestsOutcome> {
  if (!isSupabaseConfigured) return { ok: true, rows: [] };
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("genetic_tests")
        .select(TEST_COLUMNS)
        .eq("active", true)
        .order("name", { ascending: true }),
      "Loading genetic tests",
    );
    if (error) {
      if (looksLikeMissingTable(error)) {
        return {
          ok: false,
          rows: [],
          message:
            "Genetic tests table isn't set up yet. Run supabase/migrations/20260926_genetic_tests.sql.",
          missingTable: true,
        };
      }
      return {
        ok: false,
        rows: [],
        message: messageFromUnknown(error, "Couldn't load genetic tests."),
      };
    }
    return {
      ok: true,
      rows: ((data ?? []) as Record<string, unknown>[]).map(toTest),
    };
  } catch (error) {
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(error, "Couldn't load genetic tests."),
    };
  }
}

// ---------- Orders ----------

export type GeneticOrderStatus =
  | "pending_manual"
  | "created"
  | "kit_dispatched"
  | "sample_received"
  | "processing"
  | "resulted"
  | "cancelled";

export type ShippingAddress = {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  region?: string | null;
  postcode: string;
  country: string;
};

export type GeneticOrderRow = {
  id: string;
  user_id: string;
  genetic_test_id: string;
  status: GeneticOrderStatus;
  tracking: string | null;
  shipping_address: Record<string, unknown>;
  notes: string | null;
  ordered_at: string;
  created_at: string;
  updated_at: string;
};

const ORDER_COLUMNS =
  "id, user_id, genetic_test_id, status, tracking, shipping_address, notes, ordered_at, created_at, updated_at";

function toOrder(raw: Record<string, unknown>): GeneticOrderRow {
  return {
    id: raw.id as string,
    user_id: raw.user_id as string,
    genetic_test_id: raw.genetic_test_id as string,
    status: (raw.status as GeneticOrderStatus) ?? "pending_manual",
    tracking: (raw.tracking as string | null) ?? null,
    shipping_address:
      (raw.shipping_address as Record<string, unknown>) ?? {},
    notes: (raw.notes as string | null) ?? null,
    ordered_at: raw.ordered_at as string,
    created_at: raw.created_at as string,
    updated_at: raw.updated_at as string,
  };
}

export type LoadOrdersOutcome =
  | { ok: true; rows: GeneticOrderRow[] }
  | { ok: false; rows: []; message: string };

export async function loadOwnGeneticOrders(
  userId: string,
): Promise<LoadOrdersOutcome> {
  if (!isSupabaseConfigured) return { ok: true, rows: [] };
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("genetic_test_orders")
        .select(ORDER_COLUMNS)
        .eq("user_id", userId)
        .order("ordered_at", { ascending: false }),
      "Loading orders",
    );
    if (error) {
      return {
        ok: false,
        rows: [],
        message: messageFromUnknown(error, "Couldn't load orders."),
      };
    }
    return {
      ok: true,
      rows: ((data ?? []) as Record<string, unknown>[]).map(toOrder),
    };
  } catch (error) {
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(error, "Couldn't load orders."),
    };
  }
}

export type CreateOrderInput = {
  userId: string;
  geneticTestId: string;
  shippingAddress: ShippingAddress;
  notes?: string | null;
};

export type CreateOrderOutcome =
  | { ok: true; row: GeneticOrderRow }
  | { ok: false; message: string };

export async function createGeneticOrder(
  input: CreateOrderInput,
): Promise<CreateOrderOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Supabase not configured." };
  }
  const address = input.shippingAddress;
  const missing = validateShippingAddress(address);
  if (missing) {
    return { ok: false, message: missing };
  }
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("genetic_test_orders")
        .insert({
          user_id: input.userId,
          genetic_test_id: input.geneticTestId,
          shipping_address: address,
          notes: nullIfBlank(input.notes ?? null),
        })
        .select(ORDER_COLUMNS)
        .single(),
      "Creating order",
    );
    if (error || !data) {
      return {
        ok: false,
        message: messageFromUnknown(error, "Couldn't create this order."),
      };
    }
    return { ok: true, row: toOrder(data as Record<string, unknown>) };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, "Couldn't create this order."),
    };
  }
}

function nullIfBlank(value: string | null): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Returns null when the address is complete enough to save, or a short
 * user-facing message naming the first missing field. Country must be
 * ISO alpha-2 to match the profiles CHECK constraint the book flow uses.
 */
function validateShippingAddress(a: ShippingAddress): string | null {
  if (!a.name || a.name.trim().length === 0) return "Full name is required.";
  if (!a.line1 || a.line1.trim().length === 0)
    return "Address line 1 is required.";
  if (!a.city || a.city.trim().length === 0) return "City is required.";
  if (!a.postcode || a.postcode.trim().length === 0)
    return "Postcode is required.";
  const country = (a.country ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    return "Country must be a two-letter ISO code (e.g. IN, GB, US).";
  }
  return null;
}

// ---------- Results ----------

export type GeneticResultRow = {
  id: string;
  order_id: string;
  user_id: string;
  raw_report: Record<string, unknown>;
  structured: Record<string, unknown>;
  received_at: string;
  created_at: string;
};

const RESULT_COLUMNS =
  "id, order_id, user_id, raw_report, structured, received_at, created_at";

function toResult(raw: Record<string, unknown>): GeneticResultRow {
  return {
    id: raw.id as string,
    order_id: raw.order_id as string,
    user_id: raw.user_id as string,
    raw_report: (raw.raw_report as Record<string, unknown>) ?? {},
    structured: (raw.structured as Record<string, unknown>) ?? {},
    received_at: raw.received_at as string,
    created_at: raw.created_at as string,
  };
}

export type LoadLatestGeneticResultsOutcome =
  | { ok: true; rows: GeneticResultRow[] }
  | { ok: false; rows: []; message: string };

/**
 * Load the caller's most recent genetic results, newest-first. Used by
 * lib/plan when synthesising LabInputs — a later partner panel supersedes
 * an earlier one, so mergeing highest-priority-first with a "first wins"
 * rule keeps the freshest genotype call for a given gene.
 *
 * `limit` defaults to 3 (three consecutive panels is already unusual);
 * bump it if a user actually orders more.
 */
export async function loadLatestGeneticResults(
  userId: string,
  limit = 3,
): Promise<LoadLatestGeneticResultsOutcome> {
  if (!isSupabaseConfigured) return { ok: true, rows: [] };
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("genetic_test_results")
        .select(RESULT_COLUMNS)
        .eq("user_id", userId)
        .order("received_at", { ascending: false })
        .limit(limit),
      "Loading genetic results",
    );
    if (error) {
      // Missing table is a soft failure — the plan still generates without
      // genetics and Phase F may not be migrated yet in every project.
      if (rawErrorText(error).toLowerCase().includes("genetic_test_results")) {
        return { ok: true, rows: [] };
      }
      return {
        ok: false,
        rows: [],
        message: messageFromUnknown(error, "Couldn't load genetic results."),
      };
    }
    return {
      ok: true,
      rows: ((data ?? []) as Record<string, unknown>[]).map(toResult),
    };
  } catch (error) {
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(error, "Couldn't load genetic results."),
    };
  }
}

export function humanSampleType(sample: GeneticSampleType): string {
  switch (sample) {
    case "saliva":
      return "Saliva";
    case "buccal_swab":
      return "Buccal swab";
    case "blood_dbs":
      return "Dried blood spot";
    case "stool":
      return "Stool";
    case "other":
      return "Other";
    default:
      return sample;
  }
}
