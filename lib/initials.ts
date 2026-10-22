/**
 * Initials for the Moss `InitialDisc` — the one piece of logic behind an
 * otherwise purely presentational primitive, kept here so it is testable
 * without rendering.
 */

/**
 * The first character of at most the first two whitespace-separated words,
 * uppercased.
 *
 *   "Anjali Mehta"      -> "AM"
 *   "Priya"             -> "P"
 *   "  meera  k  "      -> "MK"
 *   "Anjali Devi Mehta" -> "AD"   (a third name adds no third letter)
 *   ""                  -> ""     (the caller renders no disc at all)
 *
 * Characters are taken with `Array.from`, not `name[0]`, so a non-Latin or
 * astral first letter ("Ωmega", an emoji, a Devanagari cluster's base) comes
 * through whole instead of as half a surrogate pair.
 */
export function initialsFor(name: string): string {
  if (typeof name !== "string") return "";

  return name
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toUpperCase();
}
