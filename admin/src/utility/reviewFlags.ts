/**
 * Safety flags shown at the top of the Review Queue patient screen.
 * Plain English first — matches the mobile rules engine checks.
 */

export type ReviewFlag = {
  severity: "danger" | "warning";
  title: string;
  detail: string;
};

export type InterventionForFlags = {
  id: string;
  title: string;
  trigger_finding: string;
  clinician_interaction_check?: boolean;
  status: string;
};

export type QuestionnaireSnapshot = {
  autoimmuneThyroid?: boolean;
  contraceptiveUse?: boolean;
  hrtUse?: boolean;
  bloodThinners?: boolean;
};

export type TestResultForFlags = {
  test_name: string;
  plain_name?: string | null;
  flag?: string | null;
};

function textIncludesIodine(value: string): boolean {
  const lower = value.toLowerCase();
  return lower.includes("iodine");
}

function textIncludesDimOrOmega3(value: string): boolean {
  const lower = value.toLowerCase();
  return (
    lower.includes("dim") ||
    lower.includes("i3c") ||
    lower.includes("omega-3") ||
    lower.includes("omega 3") ||
    lower.includes("fish oil")
  );
}

function thyroidAntibodiesPositive(results: TestResultForFlags[]): boolean {
  return results.some((row) => {
    const name = `${row.test_name} ${row.plain_name ?? ""}`.toLowerCase();
    if (!name.includes("antibod") && !name.includes("tpo") && !name.includes("tgab")) {
      return false;
    }
    const flag = (row.flag ?? "").toLowerCase();
    return flag === "positive" || flag === "high";
  });
}

/** Build alert banners for the clinician before they approve anything. */
export function buildReviewFlags(
  interventions: InterventionForFlags[],
  questionnaire: QuestionnaireSnapshot,
  results: TestResultForFlags[],
): ReviewFlag[] {
  const flags: ReviewFlag[] = [];
  const hormoneTherapy =
    Boolean(questionnaire.contraceptiveUse) || Boolean(questionnaire.hrtUse);
  const bloodThinners = Boolean(questionnaire.bloodThinners);
  const antibodiesPositive = thyroidAntibodiesPositive(results);

  const hasIodineRow = interventions.some(
    (row) =>
      row.status !== "declined" &&
      (textIncludesIodine(row.trigger_finding) ||
        textIncludesIodine(row.title)),
  );

  if (
    hasIodineRow &&
    (questionnaire.autoimmuneThyroid || antibodiesPositive)
  ) {
    flags.push({
      severity: "danger",
      title: "Iodine hard-stop",
      detail:
        "This patient reported active autoimmune thyroid disease or has positive thyroid antibodies. Do not approve iodine supplementation — the protocol blocks it.",
    });
  }

  const interactionRows = interventions.filter(
    (row) =>
      row.status === "draft" &&
      (row.clinician_interaction_check ||
        textIncludesDimOrOmega3(`${row.title} ${row.trigger_finding}`)),
  );

  if (interactionRows.length > 0 && (hormoneTherapy || bloodThinners)) {
    const parts: string[] = [];
    if (hormoneTherapy) {
      parts.push("hormone therapy / contraceptive use");
    }
    if (bloodThinners) {
      parts.push("blood-thinner use");
    }

    flags.push({
      severity: "warning",
      title: "DIM / omega-3 interaction check",
      detail: `Questionnaire shows ${parts.join(" and ")}. Review DIM/I3C and high-dose omega-3 items carefully before approving.`,
    });
  } else if (interactionRows.some((row) => row.clinician_interaction_check)) {
    flags.push({
      severity: "warning",
      title: "Practitioner interaction check",
      detail:
        "One or more draft items were flagged for a practitioner check (supplement interactions). Read each clinical basis before approving.",
    });
  }

  return flags;
}

/** Read a few questionnaire facts from saved JSON sections. */
export function questionnaireSnapshotFromSections(
  sections: Record<string, Record<string, unknown> | null | undefined>,
): QuestionnaireSnapshot {
  const comorbidities = sections.comorbidities ?? {};
  const reproductive = sections.reproductive_menstrual ?? {};
  const personal = sections.personal_history ?? {};

  const isYes = (value: unknown) => value === true || value === "yes";

  return {
    autoimmuneThyroid: isYes(comorbidities.autoimmune_thyroid),
    contraceptiveUse: isYes(reproductive.contraceptiveUse),
    hrtUse: isYes(reproductive.hrtUse) || isYes(reproductive.hrt_use),
    bloodThinners:
      isYes(personal.blood_thinners) || isYes(personal.bloodThinners),
  };
}
