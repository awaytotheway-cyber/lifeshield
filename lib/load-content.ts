/**
 * Load admin-editable questionnaire wording and onboarding copy.
 *
 * Mirrors lib/load-thresholds.ts:
 * 1. Serve from an in-memory cache for CACHE_TTL_MS.
 * 2. Otherwise read `content_fields` + `app_copy` from Supabase.
 * 3. On any error, missing keys, or unconfigured Supabase → return the last
 *    good content, else EMPTY_CONTENT, which makes every resolve* helper
 *    fall through to the string the screen already hardcodes.
 *
 * Never throws. A content outage degrades to the shipped wording, never to
 * a blank questionnaire.
 *
 * TTL is 5 minutes, so an admin edit reaches a running app within about
 * five minutes without any push channel.
 */
import {
  EMPTY_CONTENT,
  indexContentFields,
  type AppContent,
  type ContentField,
} from "@/lib/app-content";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const CACHE_TTL_MS = 5 * 60 * 1000;

let cached: AppContent | null = null;
let cacheLoadedAt = 0;

/** Clear cache after an admin edit, on sign-out, or in unit tests. */
export function clearContentCache(): void {
  cached = null;
  cacheLoadedAt = 0;
}

/** Last loaded content without touching the network. */
export function peekContent(): AppContent {
  return cached ?? EMPTY_CONTENT;
}

export type LoadContentOptions = {
  forceRefresh?: boolean;
};

async function fetchRevision(): Promise<number | null> {
  const { data, error } = await supabase
    .from("content_revision")
    .select("revision")
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    return null;
  }
  const value = Number((data as { revision: unknown }).revision);
  return Number.isFinite(value) ? value : null;
}

export async function loadAppContent(
  options?: LoadContentOptions,
): Promise<AppContent> {
  const now = Date.now();

  if (!options?.forceRefresh && cached && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cached;
  }

  if (!isSupabaseConfigured) {
    cached = cached ?? EMPTY_CONTENT;
    cacheLoadedAt = now;
    return cached;
  }

  try {
    // Cheap poll first: if the stamp has not moved, keep what we have and
    // skip pulling the whole payload.
    const revision = await fetchRevision();
    if (cached && revision !== null && revision === cached.revision) {
      cacheLoadedAt = now;
      return cached;
    }

    const [fieldsResult, copyResult] = await Promise.all([
      supabase
        .from("content_fields")
        .select(
          "section, field_key, label, help_text, field_type, options, sort_order, required, is_locked, is_active",
        )
        .eq("is_active", true),
      supabase.from("app_copy").select("copy_key, value"),
    ]);

    if (fieldsResult.error || copyResult.error) {
      cached = cached ?? EMPTY_CONTENT;
      cacheLoadedAt = now;
      return cached;
    }

    const rows = (fieldsResult.data ?? []) as ContentField[];
    const copyRows = (copyResult.data ?? []) as {
      copy_key: string;
      value: string;
    }[];

    const copy: Record<string, string> = {};
    for (const row of copyRows) {
      if (row && typeof row.copy_key === "string") {
        copy[row.copy_key] = String(row.value ?? "");
      }
    }

    cached = {
      fields: indexContentFields(rows),
      copy,
      revision: revision ?? 0,
    };
    cacheLoadedAt = now;
    return cached;
  } catch {
    cached = cached ?? EMPTY_CONTENT;
    cacheLoadedAt = now;
    return cached;
  }
}
