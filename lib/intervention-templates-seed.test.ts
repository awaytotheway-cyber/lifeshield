/**
 *   npx --yes tsx --tsconfig tsconfig.json lib/intervention-templates-seed.test.ts
 *
 * Drift check: for every id in the hard-coded FINDING_INTERVENTION_TABLE,
 * the seed migration must include a matching `code` and its `trigger_finding`
 * must be listed in that template's trigger_findings ARRAY[]. Catches the
 * common failure mode of adding a rules-engine entry without updating the
 * seed, which would leave that intervention without a template render.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FINDING_INTERVENTION_TABLE } from "./rules-engine";

const SEED_PATH = resolve(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260925_seed_intervention_templates.sql",
);

const sql = readFileSync(SEED_PATH, "utf8");

for (const entry of FINDING_INTERVENTION_TABLE) {
  // The code must appear as the row's first quoted string. Match on a
  // whole word between single quotes to avoid a false positive from a
  // substring in a description.
  const codeRegex = new RegExp(`'${escapeRe(entry.id)}'`);
  assert.equal(
    codeRegex.test(sql),
    true,
    `seed missing code for rules-engine id "${entry.id}"`,
  );

  // The exact trigger_finding string must appear as an element in some
  // ARRAY[...] literal so template lookup matches at runtime.
  const findingRegex = new RegExp(`'${escapeRe(entry.trigger_finding)}'`);
  assert.equal(
    findingRegex.test(sql),
    true,
    `seed missing trigger_finding "${entry.trigger_finding}" for "${entry.id}"`,
  );
}

function escapeRe(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// eslint-disable-next-line no-console
console.log("intervention-templates-seed.test.ts OK");
