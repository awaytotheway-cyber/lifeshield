/**
 * Plugins — a small catalog of optional features the user can toggle on
 * for themselves. Toggling is idempotent (unique on user × plugin).
 */
import { COPY } from "@/lib/copy";
import { messageFromUnknown, rawErrorText } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type PluginCategory =
  | "data_import"
  | "content_recommendation"
  | "social"
  | "notifications"
  | "integrations"
  | "other";

export type PluginRow = {
  id: string;
  slug: string;
  name: string;
  category: PluginCategory;
  description: string;
  privacy_disclosure: string;
  provider: string | null;
  homepage_url: string | null;
  logo_url: string | null;
  active: boolean;
  created_at: string;
};

export type EnabledPluginRow = {
  id: string;
  user_id: string;
  plugin_id: string;
  enabled: boolean;
  usage_count: number;
  meta: unknown;
  enabled_at: string;
  disabled_at: string | null;
};

const PLUGIN_COLS =
  "id, slug, name, category, description, privacy_disclosure, provider, homepage_url, logo_url, active, created_at";
const ENABLED_COLS =
  "id, user_id, plugin_id, enabled, usage_count, meta, enabled_at, disabled_at";

function looksLikeMissing(error: unknown): boolean {
  const t = rawErrorText(error).toLowerCase();
  return (
    (t.includes("plugins") || t.includes("enabled_plugins")) &&
    (t.includes("does not exist") ||
      t.includes("could not find") ||
      t.includes("42p01") ||
      t.includes("pgrst205"))
  );
}

export async function loadPlugins(): Promise<
  { ok: true; rows: PluginRow[] } | { ok: false; message: string }
> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    const { data, error } = await supabase
      .from("plugins")
      .select(PLUGIN_COLS)
      .eq("active", true)
      .order("category")
      .order("name");
    if (error) throw error;
    return { ok: true, rows: (data as PluginRow[]) ?? [] };
  } catch (error) {
    if (looksLikeMissing(error)) return { ok: false, message: COPY.pluginsNeedSql };
    return { ok: false, message: messageFromUnknown(error, COPY.pluginsLoadFailed) };
  }
}

export async function loadOwnEnabledPlugins(userId: string): Promise<
  { ok: true; rows: EnabledPluginRow[] } | { ok: false; message: string }
> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    const { data, error } = await supabase
      .from("enabled_plugins")
      .select(ENABLED_COLS)
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true, rows: (data as EnabledPluginRow[]) ?? [] };
  } catch (error) {
    if (looksLikeMissing(error)) return { ok: false, message: COPY.pluginsNeedSql };
    return { ok: false, message: messageFromUnknown(error, COPY.pluginsLoadFailed) };
  }
}

export async function togglePlugin(
  userId: string,
  pluginId: string,
  next: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    const { error } = await supabase
      .from("enabled_plugins")
      .upsert(
        {
          user_id: userId,
          plugin_id: pluginId,
          enabled: next,
          enabled_at: next ? new Date().toISOString() : new Date(0).toISOString(),
          disabled_at: next ? null : new Date().toISOString(),
        },
        { onConflict: "user_id,plugin_id" },
      );
    if (error) throw error;
    return { ok: true };
  } catch (error) {
    return { ok: false, message: messageFromUnknown(error, COPY.pluginsLoadFailed) };
  }
}

/** Remove the user_plugin row entirely (used with "delete associated data"). */
export async function disconnectPlugin(
  userId: string,
  pluginId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    const { error } = await supabase
      .from("enabled_plugins")
      .delete()
      .eq("user_id", userId)
      .eq("plugin_id", pluginId);
    if (error) throw error;
    return { ok: true };
  } catch (error) {
    return { ok: false, message: messageFromUnknown(error, COPY.pluginsLoadFailed) };
  }
}
