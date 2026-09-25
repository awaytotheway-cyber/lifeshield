/**
 * Supabase reads for the labs library + booking helper (Phase D).
 *
 * Kept out of lib/lab-search.ts so the pure ranking logic stays testable
 * without a Supabase connection.
 */
import { messageFromUnknown, rawErrorText } from "@/lib/friendly-errors";
import type { LabRow } from "@/lib/lab-search";
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
    text.includes("labs") &&
    (text.includes("does not exist") ||
      text.includes("relation") ||
      text.includes("not found"))
  );
}

const LAB_COLUMNS =
  "id, provider_code, name, address, postcode, country, price, currency, availability, contact, active, created_at, updated_at";

export type LoadLabsOutcome =
  | { ok: true; rows: LabRow[] }
  | { ok: false; rows: []; message: string; missingTable?: boolean };

function toLab(raw: Record<string, unknown>): LabRow {
  return {
    id: raw.id as string,
    provider_code: (raw.provider_code as string) ?? "manual",
    name: raw.name as string,
    address: (raw.address as Record<string, unknown>) ?? {},
    postcode: (raw.postcode as string | null) ?? null,
    country: (raw.country as string | null) ?? null,
    price: (raw.price as number | null) ?? null,
    currency: (raw.currency as string) ?? "INR",
    availability: (raw.availability as Record<string, unknown>) ?? {},
    contact: (raw.contact as Record<string, unknown>) ?? {},
    active: Boolean(raw.active),
    created_at: raw.created_at as string,
    updated_at: raw.updated_at as string,
  };
}

/**
 * Fetch every active lab. Ranking + country filtering happen in the pure
 * lib/lab-search helper — this loader deliberately doesn't push a country
 * filter to the DB so a country-less lab (mail-in / global) still comes
 * back for every user.
 */
export async function loadActiveLabs(): Promise<LoadLabsOutcome> {
  if (!isSupabaseConfigured) return { ok: true, rows: [] };
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("labs")
        .select(LAB_COLUMNS)
        .eq("active", true)
        .order("name", { ascending: true }),
      "Loading labs",
    );
    if (error) {
      if (looksLikeMissingTable(error)) {
        return {
          ok: false,
          rows: [],
          message:
            "Labs table isn't set up yet. Run supabase/migrations/20260926_labs_and_booking.sql.",
          missingTable: true,
        };
      }
      return {
        ok: false,
        rows: [],
        message: messageFromUnknown(error, "Couldn't load labs."),
      };
    }
    const rows = (data ?? []).map((raw) => toLab(raw as Record<string, unknown>));
    return { ok: true, rows };
  } catch (error) {
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(error, "Couldn't load labs."),
    };
  }
}

export type ProfileLocation = {
  location_postcode: string | null;
  location_country: string | null;
};

export type LoadLocationOutcome =
  | { ok: true; location: ProfileLocation }
  | { ok: false; message: string };

/** Read the caller's location fields from profiles. */
export async function loadOwnLocation(
  userId: string,
): Promise<LoadLocationOutcome> {
  if (!isSupabaseConfigured) {
    return {
      ok: true,
      location: { location_postcode: null, location_country: null },
    };
  }
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("profiles")
        .select("location_postcode, location_country")
        .eq("id", userId)
        .maybeSingle(),
      "Loading location",
    );
    if (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, "Couldn't load your location."),
      };
    }
    return {
      ok: true,
      location: {
        location_postcode: (data?.location_postcode as string | null) ?? null,
        location_country: (data?.location_country as string | null) ?? null,
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, "Couldn't load your location."),
    };
  }
}

export type SaveLocationOutcome =
  | { ok: true }
  | { ok: false; message: string };

export async function saveOwnLocation(
  userId: string,
  location: ProfileLocation,
): Promise<SaveLocationOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Supabase not configured." };
  }
  // The country CHECK on profiles enforces 2 uppercase letters — normalise
  // here so the user typing "gb" or " gb " still saves cleanly.
  const country = location.location_country
    ? location.location_country.trim().toUpperCase()
    : null;
  const postcode = location.location_postcode
    ? location.location_postcode.trim()
    : null;
  try {
    const { error } = await withTimeout(
      supabase
        .from("profiles")
        .update({
          location_country: country,
          location_postcode: postcode,
        })
        .eq("id", userId),
      "Saving location",
    );
    if (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, "Couldn't save your location."),
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, "Couldn't save your location."),
    };
  }
}

// ---------- Booking ----------

export type BookLabInput = {
  userId: string;
  testOrderId: string;
  labId: string;
  bookingSlotAt: string | null;
  preparationInstructions?: string | null;
};

export type BookLabOutcome =
  | { ok: true; labOrderId: string }
  | { ok: false; message: string };

/**
 * Insert a lab_orders row for a self-booked test. Distinct from
 * createLabOrdersForStoreOrder in lib/lab-orders — that path fires after a
 * paid store checkout, this one after the user picked a lab directly from
 * the booking screen.
 *
 * status = 'pending_manual' by design until an admin confirms the booking
 * with the lab out-of-band (or a live provider wraps this call in a
 * server-side action). We don't touch test_orders.status here — the plan
 * screen decides how to reflect a booking against a recommendation.
 */
export async function bookLabOrder(
  input: BookLabInput,
): Promise<BookLabOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Supabase not configured." };
  }
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("lab_orders")
        .insert({
          user_id: input.userId,
          test_order_id: input.testOrderId,
          lab_id: input.labId,
          booking_slot_at: input.bookingSlotAt,
          preparation_instructions: input.preparationInstructions ?? null,
          status: "pending_manual",
        })
        .select("id")
        .single(),
      "Booking lab",
    );
    if (error || !data) {
      return {
        ok: false,
        message: messageFromUnknown(error, "Couldn't book this test."),
      };
    }
    return { ok: true, labOrderId: data.id as string };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, "Couldn't book this test."),
    };
  }
}

// ---------- Test orders ----------

export type TestOrderSummary = {
  id: string;
  user_id: string;
  test_tier: number;
  test_name: string;
  trigger_reason: string | null;
  status: string;
  created_at: string;
};

export type LoadTestOrdersOutcome =
  | { ok: true; rows: TestOrderSummary[] }
  | { ok: false; rows: []; message: string };

/**
 * Fetch the caller's outstanding recommended tests. Kept here rather than
 * in lib/lab-orders because the booking flow is the only screen reading
 * it — lab-orders itself is about the fulfilment records.
 */
export async function loadRecommendedTestOrders(
  userId: string,
): Promise<LoadTestOrdersOutcome> {
  if (!isSupabaseConfigured) return { ok: true, rows: [] };
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("test_orders")
        .select(
          "id, user_id, test_tier, test_name, trigger_reason, status, created_at",
        )
        .eq("user_id", userId)
        .eq("status", "recommended")
        .order("test_tier", { ascending: true })
        .order("created_at", { ascending: false }),
      "Loading recommended tests",
    );
    if (error) {
      return {
        ok: false,
        rows: [],
        message: messageFromUnknown(error, "Couldn't load recommended tests."),
      };
    }
    return { ok: true, rows: (data ?? []) as TestOrderSummary[] };
  } catch (error) {
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(error, "Couldn't load recommended tests."),
    };
  }
}
