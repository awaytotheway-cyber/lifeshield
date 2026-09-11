/**
 * Detects "the save never reached a working server helper".
 * Kept separate from the form so we can test it without starting the app.
 */
import { rawErrorText } from "@/lib/friendly-errors";

/** Edge Function never answered (not deployed, wrong name, or CORS). */
export function looksLikeUnreachableFunction(
  error: unknown,
  status?: number,
): boolean {
  if (status === 404) {
    return true;
  }
  const text = rawErrorText(error).toLowerCase();
  return (
    text.includes("failed to send a request") ||
    text.includes("failed to send a request to the edge function") ||
    (text.includes("edge function") && text.includes("failed")) ||
    text.includes("function not found") ||
    text.includes("requested function was not found") ||
    (text.includes("not found") && text.includes("function")) ||
    text.includes("failed to fetch") ||
    text.includes("network request failed") ||
    (text.includes("cors") &&
      (text.includes("localhost") || text.includes("access-control"))) ||
    text.includes("404")
  );
}

/** PostgREST cannot find save_reviewed_result — SQL file was not run. */
export function looksLikeMissingRpc(error: unknown): boolean {
  const text = rawErrorText(error).toLowerCase();
  return (
    text.includes("pgrst202") ||
    text.includes("pgrst204") ||
    text.includes("could not find the function") ||
    (text.includes("save_reviewed_result") &&
      (text.includes("does not exist") ||
        text.includes("not find") ||
        text.includes("schema cache"))) ||
    (text.includes("function") &&
      text.includes("schema cache") &&
      text.includes("save_reviewed"))
  );
}
