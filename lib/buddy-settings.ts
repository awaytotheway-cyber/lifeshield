/**
 * Read + save the buddy opt-in fields on the user's profile row.
 * Small standalone helper so the big profile form doesn't have to grow.
 */
import { COPY } from "@/lib/copy";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type BuddySettings = {
  is_buddy_discoverable: boolean;
  buddy_display_name: string;
  city: string;
  interests: string[];
};

export const EMPTY_BUDDY_SETTINGS: BuddySettings = {
  is_buddy_discoverable: false,
  buddy_display_name: "",
  city: "",
  interests: [],
};

export function interestsToString(list: string[]): string {
  return list.join(", ");
}

export function interestsFromString(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 32)
    .slice(0, 12);
}

export async function loadBuddySettings(
  userId: string,
): Promise<
  { ok: true; row: BuddySettings } | { ok: false; message: string }
> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("is_buddy_discoverable, buddy_display_name, city, interests")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    const row = data ?? {};
    return {
      ok: true,
      row: {
        is_buddy_discoverable: Boolean(
          (row as { is_buddy_discoverable?: boolean }).is_buddy_discoverable,
        ),
        buddy_display_name:
          (row as { buddy_display_name?: string | null }).buddy_display_name ?? "",
        city: (row as { city?: string | null }).city ?? "",
        interests:
          ((row as { interests?: string[] | null }).interests ?? []) as string[],
      },
    };
  } catch (error) {
    return { ok: false, message: messageFromUnknown(error, COPY.buddiesLoadFailed) };
  }
}

export async function saveBuddySettings(
  userId: string,
  patch: BuddySettings,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        is_buddy_discoverable: patch.is_buddy_discoverable,
        buddy_display_name: patch.buddy_display_name.trim() || null,
        city: patch.city.trim() || null,
        interests: patch.interests,
      })
      .eq("id", userId);
    if (error) throw error;
    return { ok: true };
  } catch (error) {
    return { ok: false, message: messageFromUnknown(error, COPY.buddiesLoadFailed) };
  }
}
