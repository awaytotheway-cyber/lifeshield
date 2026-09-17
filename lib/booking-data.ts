/**
 * Phase 5 Wave A — guided test booking: Supabase reads and writes.
 *
 * Pure logic (prep steps, slot grouping, reminder timing) lives in
 * lib/booking.ts so it stays testable without a device.
 *
 * Every call here returns a plain outcome object with a friendly message —
 * no throwing into a screen, no blank states.
 */
import {
  bookingFailureMessage,
  isUsablePostcode,
  normalisePostcode,
  postcodeArea,
  type ClinicOption,
  type LabSlot,
  type BookingRow,
  type PrepStep,
  type TestPrepSource,
} from "@/lib/booking";
import { COPY } from "@/lib/copy";
import { messageFromUnknown, rawErrorText } from "@/lib/friendly-errors";
import { testNameForProductClinicalName } from "@/lib/lab-provider";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

function looksLikeMissingBookingTables(error: unknown): boolean {
  const text = rawErrorText(error).toLowerCase();
  return (
    (text.includes("lab_slots") ||
      text.includes("bookings") ||
      text.includes("clinics_with_next_slot") ||
      text.includes("book_lab_slot")) &&
    (text.includes("does not exist") ||
      text.includes("schema cache") ||
      text.includes("pgrst205") ||
      text.includes("pgrst202") ||
      text.includes("could not find"))
  );
}

export type LoadClinicsOutcome =
  | { ok: true; clinics: ClinicOption[] }
  | { ok: false; clinics: []; message: string; needSql?: boolean };

/** Labs near a postcode, each with its next free slot. */
export async function loadClinics(
  postcode: string,
): Promise<LoadClinicsOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, clinics: [], message: COPY.missingKeys };
  }
  const area = postcodeArea(postcode);
  try {
    const { data, error } = await supabase.rpc("clinics_with_next_slot", {
      p_postcode_area: area || null,
    });
    if (error) {
      throw error;
    }
    const rows = (data ?? []) as ClinicOption[];
    return {
      ok: true,
      clinics: rows.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        address: row.address ?? null,
        city: row.city ?? null,
        postcode: row.postcode ?? null,
        postcode_area: row.postcode_area ?? null,
        offers_home_collection: Boolean(row.offers_home_collection),
        operating_hours: row.operating_hours ?? null,
        next_slot_at: row.next_slot_at ?? null,
        open_slot_count: Number(row.open_slot_count ?? 0),
        from_price_cents:
          row.from_price_cents === null || row.from_price_cents === undefined
            ? null
            : Number(row.from_price_cents),
      })),
    };
  } catch (error) {
    if (looksLikeMissingBookingTables(error)) {
      return {
        ok: false,
        clinics: [],
        message: COPY.bookingNeedSql,
        needSql: true,
      };
    }
    return {
      ok: false,
      clinics: [],
      message: messageFromUnknown(error, COPY.bookingClinicsFailed),
    };
  }
}

export type LoadSlotsOutcome =
  | { ok: true; slots: LabSlot[] }
  | { ok: false; slots: []; message: string; needSql?: boolean };

/** Free slots for one clinic over the next `days` days. */
export async function loadSlots(
  clinicId: string,
  days = 21,
): Promise<LoadSlotsOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, slots: [], message: COPY.missingKeys };
  }
  try {
    const until = new Date(Date.now() + days * 24 * 60 * 60_000).toISOString();
    const { data, error } = await supabase
      .from("lab_slots")
      .select(
        "id, clinic_id, starts_at, duration_minutes, capacity, booked_count, price_cents, currency",
      )
      .eq("clinic_id", clinicId)
      .eq("active", true)
      .gt("starts_at", new Date().toISOString())
      .lt("starts_at", until)
      .order("starts_at", { ascending: true });
    if (error) {
      throw error;
    }
    return {
      ok: true,
      slots: (data ?? []).map((row) => {
        const slot = row as LabSlot;
        return {
          id: String(slot.id),
          clinic_id: String(slot.clinic_id),
          starts_at: String(slot.starts_at),
          duration_minutes: Number(slot.duration_minutes ?? 15),
          capacity: Number(slot.capacity ?? 1),
          booked_count: Number(slot.booked_count ?? 0),
          price_cents:
            slot.price_cents === null || slot.price_cents === undefined
              ? null
              : Number(slot.price_cents),
          currency: String(slot.currency ?? "GBP"),
        };
      }),
    };
  } catch (error) {
    if (looksLikeMissingBookingTables(error)) {
      return { ok: false, slots: [], message: COPY.bookingNeedSql, needSql: true };
    }
    return {
      ok: false,
      slots: [],
      message: messageFromUnknown(error, COPY.bookingSlotsFailed),
    };
  }
}

export type BookSlotOutcome =
  | { ok: true; bookingId: string }
  | { ok: false; message: string; needSql?: boolean };

/**
 * Take the slot. The database re-checks availability inside the transaction,
 * so a slot that went while the patient was deciding fails cleanly here rather
 * than double-booking someone.
 */
export async function bookSlot(input: {
  slotId: string;
  labOrderId?: string | null;
  testOrderId?: string | null;
  prepSteps: PrepStep[];
}): Promise<BookSlotOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }
  try {
    const { data, error } = await supabase.rpc("book_lab_slot", {
      p_slot_id: input.slotId,
      p_lab_order_id: input.labOrderId ?? null,
      p_test_order_id: input.testOrderId ?? null,
      p_prep_snapshot: input.prepSteps,
    });
    if (error) {
      throw error;
    }
    const payload = (data ?? {}) as {
      ok?: boolean;
      booking_id?: string;
      reason?: string;
    };
    if (payload.ok && payload.booking_id) {
      return { ok: true, bookingId: String(payload.booking_id) };
    }
    return {
      ok: false,
      message: bookingFailureMessage(String(payload.reason ?? "")),
    };
  } catch (error) {
    if (looksLikeMissingBookingTables(error)) {
      return { ok: false, message: COPY.bookingNeedSql, needSql: true };
    }
    return { ok: false, message: messageFromUnknown(error, COPY.bookingFailed) };
  }
}

export type RequestKitOutcome =
  | { ok: true; bookingId: string }
  | { ok: false; message: string; needSql?: boolean };

/** Home kit: no slot to hold, just an address and a date we post it to. */
export async function requestHomeKit(input: {
  userId: string;
  addressLine: string;
  postcode: string;
  testOrderId?: string | null;
  prepSteps: PrepStep[];
}): Promise<RequestKitOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }
  if (!input.addressLine.trim() || !isUsablePostcode(input.postcode)) {
    return { ok: false, message: COPY.bookingAddressNeeded };
  }
  try {
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        user_id: input.userId,
        kind: "home_kit",
        status: "confirmed",
        address_line: input.addressLine.trim(),
        postcode: normalisePostcode(input.postcode),
        test_order_id: input.testOrderId ?? null,
        prep_ack_at: new Date().toISOString(),
        prep_snapshot: input.prepSteps,
      })
      .select("id")
      .single();
    if (error) {
      throw error;
    }
    return { ok: true, bookingId: String((data as { id: string }).id) };
  } catch (error) {
    if (looksLikeMissingBookingTables(error)) {
      return { ok: false, message: COPY.bookingNeedSql, needSql: true };
    }
    return { ok: false, message: messageFromUnknown(error, COPY.bookingKitFailed) };
  }
}

export type LoadBookingsOutcome =
  | { ok: true; bookings: BookingRow[] }
  | { ok: false; bookings: []; message: string; needSql?: boolean };

export async function loadOwnBookings(
  userId: string,
): Promise<LoadBookingsOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, bookings: [], message: COPY.missingKeys };
  }
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, user_id, lab_order_id, test_order_id, slot_id, clinic_id, kind, status, scheduled_for, address_line, postcode, prep_ack_at, created_at",
      )
      .eq("user_id", userId)
      .order("scheduled_for", { ascending: true, nullsFirst: false });
    if (error) {
      throw error;
    }
    return { ok: true, bookings: (data ?? []) as BookingRow[] };
  } catch (error) {
    if (looksLikeMissingBookingTables(error)) {
      return {
        ok: false,
        bookings: [],
        message: COPY.bookingNeedSql,
        needSql: true,
      };
    }
    return {
      ok: false,
      bookings: [],
      message: messageFromUnknown(error, COPY.bookingsLoadFailed),
    };
  }
}

export type CancelBookingOutcome =
  | { ok: true }
  | { ok: false; message: string };

export async function cancelBooking(
  bookingId: string,
): Promise<CancelBookingOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }
  try {
    const { data, error } = await supabase.rpc("cancel_booking", {
      p_booking_id: bookingId,
    });
    if (error) {
      throw error;
    }
    const payload = (data ?? {}) as { ok?: boolean; reason?: string };
    if (payload.ok) {
      return { ok: true };
    }
    return {
      ok: false,
      message:
        payload.reason === "not_cancellable"
          ? COPY.bookingNotCancellable
          : COPY.bookingCancelFailed,
    };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, COPY.bookingCancelFailed),
    };
  }
}

export type LoadTestPrepOutcome =
  | { ok: true; tests: TestPrepSource[] }
  | { ok: false; tests: []; message: string };

/**
 * The preparation rules for the tests this person was recommended.
 *
 * We match the catalog's clinical_name back to the rules-engine test name with
 * the same mapping the lab provider uses, so there is one source of truth for
 * "which product is this test".
 */
export async function loadTestPrepSources(
  testNames: string[],
): Promise<LoadTestPrepOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, tests: [], message: COPY.missingKeys };
  }
  const wanted = new Set(testNames);
  try {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, plain_name, clinical_name, prep_instructions, fasting_required, fasting_hours, cycle_day_window, home_kit_available",
      )
      .eq("product_type", "test")
      .eq("active", true);
    if (error) {
      throw error;
    }
    const rows = (data ?? []) as {
      id: string;
      plain_name: string | null;
      clinical_name: string | null;
      prep_instructions: string | null;
      fasting_required: boolean | null;
      fasting_hours: number | null;
      cycle_day_window: string | null;
      home_kit_available: boolean | null;
    }[];

    const tests: TestPrepSource[] = [];
    for (const row of rows) {
      const testName = row.clinical_name
        ? testNameForProductClinicalName(row.clinical_name)
        : null;
      // No recommendations loaded yet? Show prep for everything rather than
      // nothing — an empty prep screen reads as "nothing to do", which is worse
      // than showing one line too many.
      if (wanted.size > 0 && (!testName || !wanted.has(testName))) {
        continue;
      }
      tests.push({
        id: String(row.id),
        name: row.plain_name ?? row.clinical_name ?? "This test",
        prep_instructions: row.prep_instructions,
        fasting_required: row.fasting_required,
        fasting_hours: row.fasting_hours,
        cycle_day_window: row.cycle_day_window,
        home_kit_available: row.home_kit_available,
      });
    }
    return { ok: true, tests };
  } catch (error) {
    // The prep columns are added by supabase/phase5-booking.sql. Until it has
    // been run we cannot promise the prep steps are complete, so we say so
    // rather than showing a reassuring but incomplete list.
    if (looksLikeMissingPrepColumns(error)) {
      return { ok: false, tests: [], message: COPY.bookingNeedSql };
    }
    return {
      ok: false,
      tests: [],
      message: messageFromUnknown(error, COPY.bookingPrepLoadFailed),
    };
  }
}

function looksLikeMissingPrepColumns(error: unknown): boolean {
  const text = rawErrorText(error).toLowerCase();
  return (
    text.includes("prep_instructions") ||
    text.includes("fasting_required") ||
    text.includes("home_kit_available") ||
    text.includes("cycle_day_window")
  );
}
