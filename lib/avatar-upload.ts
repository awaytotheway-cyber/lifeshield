/**
 * Profile photo upload.
 *
 * The picker used to save only a local file URI through AsyncStorage, so the
 * photo lived on one device: it disappeared on reinstall, never reached a
 * second device, and profiles.avatar_url stayed empty. This uploads the file
 * to the `avatars` storage bucket and records the public URL on the profile.
 *
 * Storage policy requires the object path to start with the user's own id
 * ("<uid>/avatar.jpg"), so a user can only write their own folder.
 */
import { COPY } from "@/lib/copy";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const BUCKET = "avatars";

function extensionFor(uri: string): string {
  const match = /\.(jpe?g|png|webp|heic)(?:\?|$)/i.exec(uri);
  return match ? match[1].toLowerCase() : "jpg";
}

function contentTypeFor(ext: string): string {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  return "image/jpeg";
}

export type AvatarUploadResult =
  | { ok: true; publicUrl: string }
  | { ok: false; message: string };

export async function uploadAvatar(
  userId: string,
  localUri: string,
): Promise<AvatarUploadResult> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };

  try {
    const ext = extensionFor(localUri);
    // A stable path per user means a new photo replaces the old one instead of
    // leaving orphaned files behind in the bucket.
    const path = `${userId}/avatar.${ext}`;

    // fetch() on a file:// URI is how Expo reads a picked asset into bytes.
    const response = await fetch(localUri);
    const bytes = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: contentTypeFor(ext),
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    // Bust the CDN cache, since the path is reused for every new photo.
    const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);
    if (profileError) throw profileError;

    return { ok: true, publicUrl };
  } catch (error) {
    return { ok: false, message: messageFromUnknown(error, COPY.profilePhotoFailed) };
  }
}

export async function clearAvatar(
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: COPY.missingKeys };
  try {
    // Remove every extension we might have written for this user.
    await supabase.storage
      .from(BUCKET)
      .remove(["jpg", "jpeg", "png", "webp", "heic"].map((e) => `${userId}/avatar.${e}`));

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", userId);
    if (error) throw error;
    return { ok: true };
  } catch (error) {
    return { ok: false, message: messageFromUnknown(error, COPY.profilePhotoFailed) };
  }
}
