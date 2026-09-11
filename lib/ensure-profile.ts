/**
 * Makes sure a profiles row exists for the signed-in user.
 * The SQL trigger should create this on signup. If it didn't (old user,
 * trigger missing, or a failed first run), we upsert instead of crashing.
 */
import { COPY } from "@/lib/copy";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export async function ensureProfileRow(
  userId: string,
  fullName?: string,
): Promise<{ ok: boolean; message?: string }> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, COPY.setupTables),
      };
    }

    if (!data) {
      // Upsert: create the row if the signup trigger never ran.
      const { error: upsertError } = await supabase.from("profiles").upsert(
        {
          id: userId,
          full_name: fullName?.trim() ? fullName.trim() : null,
        },
        { onConflict: "id" },
      );
      if (upsertError) {
        return {
          ok: false,
          message: messageFromUnknown(upsertError, COPY.missingProfile),
        };
      }
      return { ok: true };
    }

    if (fullName?.trim() && !data.full_name) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("id", userId);
      if (updateError) {
        // Name update is nice-to-have. The row exists, so login can continue.
        return { ok: true, message: messageFromUnknown(updateError, COPY.profileLoadFailed) };
      }
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, COPY.missingProfile),
    };
  }
}
