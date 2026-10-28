/**
 * Which tests and findings a clinician can record on the result-entry screen.
 *
 * Kept apart from lib/result-entry.ts on purpose: that file imports the
 * Supabase client, which drags in react-native and cannot run under the plain
 * `tsx` test runner. Anything that needs a unit test lives in a pure sibling
 * (the same split as lib/result-entry-errors.ts). result-entry.ts re-exports
 * everything here, so callers keep importing from "@/lib/result-entry".
 */
import type { TermKey } from "@/lib/plain-language";
import { FINDING_KEYS } from "@/lib/result-findings";

/** Tests an admin can pick. Dictionary keys so ClinicalTerm can render them. */
export const RESULT_ENTRY_TERM_KEYS = [
  "brca",
  "ctc",
  "snp",
  "routineBloods",
  "thyroid",
  "fastingInsulin",
  "salivaryCortisol",
  "b12FolateFerritin",
  "dutch",
  "stool",
  "urinaryIodine",
  "heavyMetals",
  "cyp450",
  // Structured findings. Spread from the single source of truth so a finding
  // the engine reads can never be missing from the entry screen.
  ...FINDING_KEYS,
] as const satisfies readonly TermKey[];

export type ResultEntryTermKey = (typeof RESULT_ENTRY_TERM_KEYS)[number];
