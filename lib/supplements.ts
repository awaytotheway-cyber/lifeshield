/**
 * Pure supplement-side helpers (Phase E):
 *   - contraindication matching against the user's medications
 *   - subscription-options normaliser (for the product detail banner)
 *   - supporting-studies shape guard
 *
 * IO lives in lib/supplements-io.ts. Kept split so the tests don't drag
 * supabase / RN through tsx (same pattern as intervention-templates and
 * recipes).
 */

export type MedicationLite = {
  id: string;
  name: string;
  contraindication_codes: string[];
  active: boolean;
};

export type MedicationDraft = {
  name: string;
  dosage: string | null;
  frequency: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  contraindication_codes: string[];
  active: boolean;
};

export type MedicationValidationError = {
  field: "name" | "start_date" | "end_date";
  message: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Returns [] when the draft is savable. Name required; dates optional but
 * must be YYYY-MM-DD when set, and end_date must be on or after start_date.
 */
export function validateMedicationDraft(
  draft: MedicationDraft,
): MedicationValidationError[] {
  const errors: MedicationValidationError[] = [];
  if (!draft.name || draft.name.trim().length === 0) {
    errors.push({ field: "name", message: "Add the medication name." });
  }
  if (draft.start_date && !ISO_DATE.test(draft.start_date)) {
    errors.push({
      field: "start_date",
      message: "Start date must be YYYY-MM-DD.",
    });
  }
  if (draft.end_date) {
    if (!ISO_DATE.test(draft.end_date)) {
      errors.push({
        field: "end_date",
        message: "End date must be YYYY-MM-DD.",
      });
    } else if (
      draft.start_date &&
      ISO_DATE.test(draft.start_date) &&
      draft.end_date < draft.start_date
    ) {
      errors.push({
        field: "end_date",
        message: "End date can't be before the start date.",
      });
    }
  }
  return errors;
}

export type ContraindicationWarning = {
  code: string;
  medication_names: string[];
};

/**
 * Find contraindication overlaps between a product and the user's active
 * medications. Returns one warning per overlapping code, each listing the
 * medications that triggered it. Empty array = safe to add to cart.
 *
 * Both sides are case-insensitive. Inactive medications are ignored so an
 * old row doesn't keep flagging a supplement forever.
 */
export function contraindicationWarnings(
  productCodes: readonly string[],
  medications: readonly MedicationLite[],
): ContraindicationWarning[] {
  const productSet = new Set(
    productCodes
      .map((code) => code.trim().toLowerCase())
      .filter((code) => code.length > 0),
  );
  if (productSet.size === 0) return [];

  const hits = new Map<string, string[]>();
  for (const med of medications) {
    if (!med.active) continue;
    for (const raw of med.contraindication_codes) {
      const code = raw.trim().toLowerCase();
      if (!productSet.has(code)) continue;
      const list = hits.get(code) ?? [];
      if (!list.includes(med.name)) list.push(med.name);
      hits.set(code, list);
    }
  }

  return Array.from(hits.entries())
    .map(([code, medication_names]) => ({ code, medication_names }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

// ---------- Subscription options ----------

export type SubscriptionInterval = "monthly" | "quarterly" | "yearly";

export type SubscriptionOptions = {
  intervals: SubscriptionInterval[];
  discount_percent: number | null;
};

const ALLOWED_INTERVALS: readonly SubscriptionInterval[] = [
  "monthly",
  "quarterly",
  "yearly",
];

/**
 * Normalise a raw subscription_options jsonb value. Missing / malformed data
 * returns `{ intervals: [], discount_percent: null }` — the caller then
 * hides the subscription banner rather than showing "Subscribe" with no
 * intervals to pick.
 */
export function parseSubscriptionOptions(raw: unknown): SubscriptionOptions {
  const parsed = parseJsonMaybe(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { intervals: [], discount_percent: null };
  }
  const source = parsed as {
    intervals?: unknown;
    discount_percent?: unknown;
  };
  const intervals = Array.isArray(source.intervals)
    ? source.intervals
        .map((v) => (typeof v === "string" ? v.toLowerCase() : ""))
        .filter((v): v is SubscriptionInterval =>
          (ALLOWED_INTERVALS as readonly string[]).includes(v),
        )
    : [];
  const rawDiscount = source.discount_percent;
  const discount_percent =
    typeof rawDiscount === "number" && Number.isFinite(rawDiscount)
      ? Math.max(0, Math.min(100, rawDiscount))
      : null;
  return { intervals, discount_percent };
}

export function isSubscribable(options: SubscriptionOptions): boolean {
  return options.intervals.length > 0;
}

// ---------- Supporting studies ----------

export type StudyCitation = {
  title: string;
  url: string;
  source?: string;
  year?: number;
};

export function parseSupportingStudies(raw: unknown): StudyCitation[] {
  const parsed = parseJsonMaybe(raw);
  if (!Array.isArray(parsed)) return [];
  const out: StudyCitation[] = [];
  for (const item of parsed) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof (item as { title?: unknown }).title !== "string" ||
      typeof (item as { url?: unknown }).url !== "string"
    ) {
      continue;
    }
    const source = item as {
      title: string;
      url: string;
      source?: unknown;
      year?: unknown;
    };
    const citation: StudyCitation = {
      title: source.title.trim(),
      url: source.url.trim(),
    };
    if (typeof source.source === "string" && source.source.trim().length > 0) {
      citation.source = source.source.trim();
    }
    if (typeof source.year === "number" && Number.isFinite(source.year)) {
      citation.year = Math.floor(source.year);
    }
    if (citation.title && citation.url) {
      out.push(citation);
    }
  }
  return out;
}

function parseJsonMaybe(raw: unknown): unknown {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}
