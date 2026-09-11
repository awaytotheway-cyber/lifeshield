/**
 * Loads the fact bag for canPurchase() — consents, questionnaire,
 * interventions, and lab flags. Store and cart screens share this loader
 * so every gate uses the same data.
 */
import { emptyConsentFlags, type ConsentFlags, type SequentialConsent } from "@/lib/consent-flow";
import { COPY } from "@/lib/copy";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { labsFromTestResults } from "@/lib/labs-from-results";
import { loadOwnInterventions } from "@/lib/plan";
import {
  hormoneTherapyFromFacts,
  type LinkedIntervention,
  type UserContext,
} from "@/lib/purchase-gates";
import { factsFromSavedAnswers } from "@/lib/rules-facts";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { loadOwnTestResults } from "@/lib/test-results";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";

export type LoadUserContextOutcome =
  | { ok: true; context: UserContext; triggerFindings: string[] }
  | { ok: false; message: string };

function isYes(value: unknown): boolean {
  return value === true || value === "yes";
}

/** Blood thinners are not a dedicated Phase 1 field yet — read if present in JSON. */
function bloodThinnersFromSections(
  sections: Record<string, Record<string, unknown> | null>,
): boolean {
  for (const section of Object.values(sections)) {
    if (!section) {
      continue;
    }
    if (isYes(section.blood_thinners) || isYes(section.bloodThinners)) {
      return true;
    }
  }
  return false;
}

async function loadConsentFlags(userId: string): Promise<ConsentFlags> {
  const flags = { ...emptyConsentFlags };
  try {
    const { data, error } = await supabase
      .from("consent_records")
      .select("consent_type, consented")
      .eq("user_id", userId)
      .in("consent_type", ["brca", "ctc", "snp"]);
    if (error) {
      throw error;
    }
    for (const row of data ?? []) {
      const type = row.consent_type as SequentialConsent | string;
      if (type === "brca" || type === "ctc" || type === "snp") {
        flags[type as SequentialConsent] = Boolean(row.consented);
      }
    }
  } catch {
    // Consent fetch failed — gates treat missing consent as not agreed.
  }
  return flags;
}

/**
 * Build UserContext for purchase gates and the list of trigger findings
 * used to filter "Recommended from your plan".
 */
export async function loadUserContext(
  userId: string,
): Promise<LoadUserContextOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }

  try {
    const [consent, engine, results, interventions] = await Promise.all([
      loadConsentFlags(userId),
      useQuestionnaireStore.getState().loadForEngine(userId),
      loadOwnTestResults(userId),
      loadOwnInterventions(userId),
    ]);

    const sections = engine.ok ? engine.sections : {};
    const bmi = engine.ok ? engine.bmi : null;
    const facts = factsFromSavedAnswers({ bmi, sections });

    const labs = results.ok ? labsFromTestResults(results.rows) : null;
    const thyroidAntibodiesPositive = labs?.thyroidAntibodiesPositive ?? null;

    const linkedInterventions: LinkedIntervention[] = interventions.ok
      ? interventions.rows.map((row) => ({
          trigger_finding: row.trigger_finding,
          status: row.status,
        }))
      : [];

    const triggerFindings = linkedInterventions.map((row) => row.trigger_finding);

    const context: UserContext = {
      consent,
      thyroidAntibodiesPositive,
      autoimmuneThyroid: facts.autoimmuneThyroid,
      hormoneTherapy: hormoneTherapyFromFacts({
        contraceptiveUse: facts.contraceptiveUse,
        hrtUse: facts.hrtUse,
      }),
      bloodThinners: facts.bloodThinners || bloodThinnersFromSections(sections),
      linkedInterventions,
    };

    return { ok: true, context, triggerFindings };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, COPY.storeContextFailed),
    };
  }
}
