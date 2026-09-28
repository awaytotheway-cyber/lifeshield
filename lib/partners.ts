/**
 * Partner apps (meditation / exercise / sleep) — v1: cards + opt-in
 * linking + manual activity logging. Real SDK data-sync plugs into
 * daily_activities with source='partner' when partnerships are live.
 */
import { Linking, Platform } from "react-native";

import { COPY } from "@/lib/copy";
import { messageFromUnknown, rawErrorText } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type PartnerKind = "meditation" | "exercise" | "sleep" | "nutrition" | "other";
export type ActivityType =
  | "meditation"
  | "walk"
  | "run"
  | "strength"
  | "yoga"
  | "cycle"
  | "swim"
  | "sleep"
  | "other";

export type PartnerRow = {
  id: string;
  slug: string;
  name: string;
  kind: PartnerKind;
  description: string | null;
  deep_link: string | null;
  web_url: string | null;
  ios_bundle_id: string | null;
  android_package: string | null;
  logo_url: string | null;
  created_at: string;
};

export type PartnerLinkRow = {
  id: string;
  user_id: string;
  partner_id: string;
  status: "linked" | "disconnected";
  connected_at: string;
  disconnected_at: string | null;
};

export type DailyActivityRow = {
  id: string;
  user_id: string;
  partner_id: string | null;
  activity_type: ActivityType;
  duration_min: number | null;
  intensity: "easy" | "moderate" | "hard" | null;
  notes: string | null;
  performed_at: string;
  source: "manual" | "partner";
  created_at: string;
};

const PARTNER_COLS =
  "id, slug, name, kind, description, deep_link, web_url, ios_bundle_id, android_package, logo_url, created_at";
const LINK_COLS = "id, user_id, partner_id, status, connected_at, disconnected_at";
const ACT_COLS =
  "id, user_id, partner_id, activity_type, duration_min, intensity, notes, performed_at, source, created_at";

const REQUEST_TIMEOUT_MS = 15_000;
function withTimeout<T>(p: PromiseLike<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), REQUEST_TIMEOUT_MS);
    Promise.resolve(p)
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e: unknown) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

function looksLikeMissing(error: unknown): boolean {
  const t = rawErrorText(error).toLowerCase();
  return (
    (t.includes("partners") || t.includes("daily_activities") ||
      t.includes("user_partner_links")) &&
    (t.includes("does not exist") ||
      t.includes("could not find") ||
      t.includes("42p01") ||
      t.includes("pgrst205"))
  );
}

export async function loadPartners(): Promise<
  { ok: true; rows: PartnerRow[] } | { ok: false; message: string }
> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    const { data, error } = await withTimeout(
      supabase.from("partners").select(PARTNER_COLS).order("kind").order("name"),
      "Loading partners",
    );
    if (error) throw error;
    return { ok: true, rows: (data as PartnerRow[]) ?? [] };
  } catch (error) {
    if (looksLikeMissing(error)) return { ok: false, message: COPY.partnersNeedSql };
    return { ok: false, message: messageFromUnknown(error, COPY.partnersLoadFailed) };
  }
}

export async function loadOwnPartnerLinks(userId: string): Promise<
  { ok: true; rows: PartnerLinkRow[] } | { ok: false; message: string }
> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    const { data, error } = await withTimeout(
      supabase.from("user_partner_links").select(LINK_COLS).eq("user_id", userId),
      "Loading partner links",
    );
    if (error) throw error;
    return { ok: true, rows: (data as PartnerLinkRow[]) ?? [] };
  } catch (error) {
    if (looksLikeMissing(error)) return { ok: false, message: COPY.partnersNeedSql };
    return { ok: false, message: messageFromUnknown(error, COPY.partnersLoadFailed) };
  }
}

export async function togglePartnerLink(
  userId: string,
  partnerId: string,
  currentlyLinked: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    if (currentlyLinked) {
      const { error } = await supabase
        .from("user_partner_links")
        .update({ status: "disconnected", disconnected_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("partner_id", partnerId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("user_partner_links")
        .upsert(
          {
            user_id: userId,
            partner_id: partnerId,
            status: "linked",
            connected_at: new Date().toISOString(),
            disconnected_at: null,
          },
          { onConflict: "user_id,partner_id" },
        );
      if (error) throw error;
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, message: messageFromUnknown(error, COPY.partnersLoadFailed) };
  }
}

export async function openPartner(partner: PartnerRow): Promise<boolean> {
  const candidates = [partner.deep_link, partner.web_url].filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
  for (const url of candidates) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported || url.startsWith("http")) {
        await Linking.openURL(url);
        return true;
      }
    } catch {
      // try next
    }
  }
  return false;
}

export async function logActivity(input: {
  userId: string;
  partnerId?: string | null;
  activityType: ActivityType;
  durationMin?: number | null;
  intensity?: "easy" | "moderate" | "hard" | null;
  notes?: string | null;
  performedAt?: string;
}): Promise<{ ok: true; row: DailyActivityRow } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("daily_activities")
        .insert({
          user_id: input.userId,
          partner_id: input.partnerId ?? null,
          activity_type: input.activityType,
          duration_min: input.durationMin ?? null,
          intensity: input.intensity ?? null,
          notes: input.notes?.trim() || null,
          performed_at: input.performedAt ?? new Date().toISOString(),
          source: "manual",
        })
        .select(ACT_COLS)
        .single(),
      "Logging activity",
    );
    if (error) throw error;
    return { ok: true, row: data as DailyActivityRow };
  } catch (error) {
    if (looksLikeMissing(error)) return { ok: false, message: COPY.partnersNeedSql };
    return { ok: false, message: messageFromUnknown(error, COPY.partnersLoadFailed) };
  }
}

export async function loadRecentActivities(
  userId: string,
  limit = 30,
): Promise<{ ok: true; rows: DailyActivityRow[] } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("daily_activities")
        .select(ACT_COLS)
        .eq("user_id", userId)
        .order("performed_at", { ascending: false })
        .limit(limit),
      "Loading activities",
    );
    if (error) throw error;
    return { ok: true, rows: (data as DailyActivityRow[]) ?? [] };
  } catch (error) {
    if (looksLikeMissing(error)) return { ok: false, message: COPY.partnersNeedSql };
    return { ok: false, message: messageFromUnknown(error, COPY.partnersLoadFailed) };
  }
}

/** Sum minutes per day for the last N days (default 7). */
export function activityMinutesByDay(
  rows: DailyActivityRow[],
  days = 7,
): { date: string; minutes: number }[] {
  const map = new Map<string, number>();
  const now = new Date();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, 0);
  }
  for (const r of rows) {
    const key = r.performed_at.slice(0, 10);
    if (map.has(key)) {
      map.set(key, (map.get(key) ?? 0) + (r.duration_min ?? 0));
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, minutes]) => ({ date, minutes }));
}

// Silence unused-import warning on native-only builds.
void Platform;
