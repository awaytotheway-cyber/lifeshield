/**
 * Supabase reads for Phase E — medications + supplement product metadata.
 * Kept out of lib/supplements.ts so the pure contraindication matcher stays
 * testable without a Supabase connection.
 */
import { messageFromUnknown } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { MedicationLite } from "@/lib/supplements";

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

const MEDICATION_COLUMNS =
  "id, user_id, name, dosage, frequency, start_date, end_date, notes, contraindication_codes, active, created_at, updated_at";

export type MedicationRow = {
  id: string;
  user_id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  contraindication_codes: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type LoadMedicationsOutcome =
  | { ok: true; rows: MedicationRow[] }
  | { ok: false; rows: []; message: string };

/**
 * Fetch every medication the caller has entered. Both active and inactive
 * are returned — contraindicationWarnings drops inactive rows itself, but a
 * future medications-management screen wants to see everything.
 */
export async function loadOwnMedications(
  userId: string,
): Promise<LoadMedicationsOutcome> {
  if (!isSupabaseConfigured) return { ok: true, rows: [] };
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("medications")
        .select(MEDICATION_COLUMNS)
        .eq("user_id", userId)
        .order("active", { ascending: false })
        .order("created_at", { ascending: false }),
      "Loading medications",
    );
    if (error) {
      return {
        ok: false,
        rows: [],
        message: messageFromUnknown(error, "Couldn't load medications."),
      };
    }
    const rows = ((data ?? []) as Record<string, unknown>[]).map((raw) => ({
      id: raw.id as string,
      user_id: raw.user_id as string,
      name: raw.name as string,
      dosage: (raw.dosage as string | null) ?? null,
      frequency: (raw.frequency as string | null) ?? null,
      start_date: (raw.start_date as string | null) ?? null,
      end_date: (raw.end_date as string | null) ?? null,
      notes: (raw.notes as string | null) ?? null,
      contraindication_codes: Array.isArray(raw.contraindication_codes)
        ? (raw.contraindication_codes.filter(
            (v): v is string => typeof v === "string",
          ))
        : [],
      active: Boolean(raw.active),
      created_at: raw.created_at as string,
      updated_at: raw.updated_at as string,
    }));
    return { ok: true, rows };
  } catch (error) {
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(error, "Couldn't load medications."),
    };
  }
}

/** Trim a MedicationRow[] to the fields lib/supplements needs. */
export function toMedicationLites(
  rows: readonly MedicationRow[],
): MedicationLite[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    contraindication_codes: row.contraindication_codes,
    active: row.active,
  }));
}

// ---------- Product supplement metadata ----------

export type ProductSupplementMeta = {
  contraindication_codes: string[];
  subscription_options: unknown;
  supporting_studies: unknown;
};

/**
 * Fetch the Phase E columns on a product. Kept separate from
 * lib/store.ts's loader so the existing store flow doesn't select columns
 * that might not exist yet on a pre-migration database — a caller behind
 * the supplements_v2 flag calls this only when the columns are present.
 *
 * Returns null on any error (including missing-column) so the UI hides the
 * extra sections instead of surfacing a scary banner.
 */
export async function loadProductSupplementMeta(
  productId: string,
): Promise<ProductSupplementMeta | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("products")
        .select(
          "contraindication_codes, subscription_options, supporting_studies",
        )
        .eq("id", productId)
        .maybeSingle(),
      "Loading product metadata",
    );
    if (error || !data) return null;
    const raw = data as Record<string, unknown>;
    return {
      contraindication_codes: Array.isArray(raw.contraindication_codes)
        ? (raw.contraindication_codes.filter(
            (v): v is string => typeof v === "string",
          ))
        : [],
      subscription_options: raw.subscription_options ?? null,
      supporting_studies: raw.supporting_studies ?? null,
    };
  } catch {
    return null;
  }
}
