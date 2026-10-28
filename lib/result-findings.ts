/**
 * Structured result findings.
 *
 * A finding is recorded as its own result row — `test_name` is the finding key
 * and `flag` carries the outcome — so the rules engine never has to guess from
 * prose. Free text on a result is display-only: a row reading "Zonulin
 * negative" contains the word zonulin and must not be able to switch on a
 * zonulin finding. That is the failure this module exists to remove.
 *
 * `test_results.test_name` is unconstrained text and the edge function only
 * requires it non-empty, so findings need no schema or RPC change.
 *
 * Type-only import below: keep this file free of runtime imports so it can sit
 * under both the mapper and the engine without a cycle.
 */
import type { LabInputs } from "@/lib/rules-engine";

export type FindingState = "present" | "absent" | "unknown";

/** Lab-input fields that a finding can set. All are boolean | null. */
type FindingField = {
  // `-?` so an optional field (snpZygosity) cannot leak `undefined` in here.
  [K in keyof LabInputs]-?: LabInputs[K] extends boolean | null ? K : never;
}[keyof LabInputs];

type FindingDef = {
  field: FindingField;
  /**
   * Flags that mean "the finding is present". Quantitative markers read
   * "high" as present; presence/absence findings do not, because "high" has
   * no meaning for them and accepting it would mis-fire on a mis-keyed row.
   */
  presentFlags: readonly string[];
  /**
   * A positive result is never cleared by a later negative. Used for the
   * thyroid antibodies: they gate the iodine contraindication, and one clean
   * retest must not lift a block that a positive result raised.
   */
  positiveIsSticky?: boolean;
};

const ABSENT_FLAGS: readonly string[] = ["negative", "normal"];

export const FINDINGS = {
  thyroidAntibodies: {
    field: "thyroidAntibodiesPositive",
    presentFlags: ["positive", "high", "critical"],
    positiveIsSticky: true,
  },
  stoolDysbiosis: {
    field: "stoolDysbiosis",
    presentFlags: ["positive", "critical"],
  },
  stoolBetaGlucuronidase: {
    field: "stoolBetaGlucuronidaseRaised",
    presentFlags: ["positive", "high", "critical"],
  },
  stoolZonulin: {
    field: "zonulinPositive",
    presentFlags: ["positive", "high", "critical"],
  },
  stoolUndigested: {
    field: "undigestedProteinOrFat",
    presentFlags: ["positive", "critical"],
  },
  liverDetoxBarrier: {
    field: "liverDetoxOrBarrierImpaired",
    presentFlags: ["positive", "critical"],
  },
  inflammatoryOxidative: {
    field: "inflammatoryOxidativeBurden",
    presentFlags: ["positive", "high", "critical"],
  },
  oestrogenDetox: {
    field: "oestrogenDetoxImpaired",
    presentFlags: ["positive", "critical"],
  },
  // ALT/AST sit inside the routine biochemistry panel, so a combined
  // routineBloods row cannot say they are raised. This is the one way to
  // record it; without it the heavy-metal rule's liver-enzyme limb can never
  // fire, because nothing else sets liverEnzymesElevated.
  liverEnzymes: {
    field: "liverEnzymesElevated",
    presentFlags: ["positive", "high", "critical"],
  },
} as const satisfies Record<string, FindingDef>;

export type FindingKey = keyof typeof FINDINGS;

/** Result keys a clinician can record as findings, in dictionary order. */
export const FINDING_KEYS = Object.keys(FINDINGS) as FindingKey[];

export function isFindingKey(key: string): key is FindingKey {
  return Object.prototype.hasOwnProperty.call(FINDINGS, key);
}

/**
 * Reads a flag as present / absent / unknown for a finding. Anything that is
 * neither clearly present nor clearly absent is unknown, and unknown never
 * creates an intervention.
 */
export function findingState(
  flag: string | null | undefined,
  presentFlags: readonly string[],
): FindingState {
  const value = (flag ?? "").trim().toLowerCase();
  if (presentFlags.includes(value)) {
    return "present";
  }
  if (ABSENT_FLAGS.includes(value)) {
    return "absent";
  }
  return "unknown";
}

/**
 * Applies a finding row to the lab inputs. Returns true when the row was a
 * finding row (even if it recorded nothing), so the caller can skip the
 * name-matching fallbacks: a thyroidAntibodies row contains the word
 * "thyroid" and must not be read as a TSH value.
 */
export function applyFindingRow(
  row: { test_name: string; flag: string | null },
  labs: LabInputs,
): boolean {
  const key = row.test_name.trim();
  if (!isFindingKey(key)) {
    return false;
  }
  const def: FindingDef = FINDINGS[key];
  const state = findingState(row.flag, def.presentFlags);
  if (state === "unknown") {
    return true;
  }
  if (state === "present") {
    labs[def.field] = true;
    return true;
  }
  // state === "absent"
  if (def.positiveIsSticky && labs[def.field] === true) {
    return true;
  }
  labs[def.field] = false;
  return true;
}
