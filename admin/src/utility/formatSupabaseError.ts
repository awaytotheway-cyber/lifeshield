type SupabaseErrorShape = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

function asSupabaseError(error: unknown): SupabaseErrorShape | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const candidate = error as SupabaseErrorShape;
  if (
    typeof candidate.message === "string" ||
    typeof candidate.code === "string"
  ) {
    return candidate;
  }

  return null;
}

/** Turn Supabase / PostgREST errors into one readable line for staff. */
export function formatSupabaseError(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof Error && error.message.trim()) {
    const parts = [error.message.trim()];
    const shaped = asSupabaseError(error);
    if (shaped?.code) {
      parts.push(`code ${shaped.code}`);
    }
    if (shaped?.details) {
      parts.push(shaped.details);
    }
    if (shaped?.hint) {
      parts.push(shaped.hint);
    }
    return parts.join(" — ");
  }

  const shaped = asSupabaseError(error);
  if (shaped) {
    const parts = [
      shaped.message?.trim(),
      shaped.code ? `code ${shaped.code}` : null,
      shaped.details?.trim(),
      shaped.hint?.trim(),
    ].filter((part): part is string => Boolean(part && part.length > 0));

    if (parts.length > 0) {
      return parts.join(" — ");
    }
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return fallback;
}
