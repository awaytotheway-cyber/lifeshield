/**
 * Vendor-neutral entry point for activity data sources.
 *
 * The default source today is `manual` — anything typed on the phone
 * lands directly through lib/activity-io.upsertSnapshot. HealthKit and
 * Google Fit bridges will register here when the native modules land
 * (a follow-up slice); the abstraction is set up now so the UI can
 * call `syncFromNativeSources(userId)` without knowing which platform
 * it runs on.
 *
 * A source module implements the ActivitySourceAdapter interface and
 * calls `registerActivitySource` at import time. `syncFromNativeSources`
 * asks each registered adapter for the last N days and pipes the
 * readings through the same upsertSnapshot path manual entries use,
 * so units get normalised and duplicates collapse the same way.
 */
import { upsertSnapshot, type UpsertInput } from "@/lib/activity-io";
import type { ActivityKind, ActivitySource } from "@/lib/activity";

export type IncomingReading = {
  kind: ActivityKind;
  value: number;
  unit: string;
  recorded_at: string; // ISO
  value_json?: Record<string, unknown>;
};

export type ActivitySourceAdapter = {
  source: ActivitySource;
  /** Human name for the connect screen. */
  label: string;
  /** Is the adapter usable on this device right now (platform + permission). */
  isAvailable: () => Promise<boolean>;
  /** Ask the OS for permission. No-op when already granted. */
  requestPermission: () => Promise<{ ok: true } | { ok: false; message: string }>;
  /** Fetch the last N days of readings. Returns [] when off / denied. */
  fetchRecent: (days: number) => Promise<IncomingReading[]>;
};

const registry = new Map<ActivitySource, ActivitySourceAdapter>();

export function registerActivitySource(adapter: ActivitySourceAdapter): void {
  registry.set(adapter.source, adapter);
}

export function getActivitySource(
  source: ActivitySource,
): ActivitySourceAdapter | null {
  return registry.get(source) ?? null;
}

export function listActivitySources(): ActivitySourceAdapter[] {
  return Array.from(registry.values());
}

// ---------- Manual source ----------

/**
 * Manual source is always available — the user types the value in and
 * the screen calls upsertSnapshot directly. Registered here so the
 * connect screen can list "Manual" alongside HealthKit / GoogleFit and
 * the sync loop treats every source uniformly.
 */
registerActivitySource({
  source: "manual",
  label: "Manual entry",
  isAvailable: async () => true,
  requestPermission: async () => ({ ok: true }),
  fetchRecent: async () => [],
});

// ---------- Sync driver ----------

export type SyncOutcome = {
  source: ActivitySource;
  ok: boolean;
  inserted: number;
  message?: string;
};

/**
 * Pull the last N days from every registered native source and pipe the
 * readings through upsertSnapshot. Manual is skipped — no vendor to
 * poll. Returns one outcome per source so the UI can render a per-row
 * status ("HealthKit: 4 readings synced", "Google Fit: not connected").
 */
export async function syncFromNativeSources(
  userId: string,
  days = 7,
): Promise<SyncOutcome[]> {
  const outcomes: SyncOutcome[] = [];
  for (const adapter of listActivitySources()) {
    if (adapter.source === "manual") continue;
    let available = false;
    try {
      available = await adapter.isAvailable();
    } catch {
      outcomes.push({
        source: adapter.source,
        ok: false,
        inserted: 0,
        message: "Adapter unavailable on this device.",
      });
      continue;
    }
    if (!available) {
      outcomes.push({
        source: adapter.source,
        ok: false,
        inserted: 0,
        message: "Not connected.",
      });
      continue;
    }
    let readings: IncomingReading[] = [];
    try {
      readings = await adapter.fetchRecent(days);
    } catch (error) {
      outcomes.push({
        source: adapter.source,
        ok: false,
        inserted: 0,
        message: error instanceof Error ? error.message : "Fetch failed.",
      });
      continue;
    }
    let inserted = 0;
    for (const reading of readings) {
      const input: UpsertInput = {
        kind: reading.kind,
        value: reading.value,
        unit: reading.unit,
        source: adapter.source,
        recorded_at: reading.recorded_at,
        value_json: reading.value_json ?? {},
      };
      const outcome = await upsertSnapshot(userId, input);
      if (outcome.ok) inserted += 1;
    }
    outcomes.push({ source: adapter.source, ok: true, inserted });
  }
  return outcomes;
}
