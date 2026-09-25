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

const MIGRATIONS_DIR = resolve(
  __dirname,
  "..",
  "supabase",
  "migrations",
);

// Two migrations carry the template rows: the initial seed and the extension
// that adds the engine-facing columns (plain_reason / description / category /
// needs_interaction_check). Both are idempotent ON CONFLICT (code) DO UPDATE,
// and the latter's re-insert becomes the effective content after both run.
// The drift check validates against the extension migration since it's the
// one plan.ts's engine flip depends on.
const seedSql = readFileSync(
  resolve(MIGRATIONS_DIR, "20260925_seed_intervention_templates.sql"),
  "utf8",
);
const extendSql = readFileSync(
  resolve(MIGRATIONS_DIR, "20260926_extend_intervention_templates_for_engine.sql"),
  "utf8",
);

for (const entry of FINDING_INTERVENTION_TABLE) {
  const codeRegex = new RegExp(`'${escapeRe(entry.id)}'`);
  const findingRegex = new RegExp(`'${escapeRe(entry.trigger_finding)}'`);

  // Original seed: every id + trigger_finding must be present.
  assert.equal(
    codeRegex.test(seedSql),
    true,
    `initial seed missing code for rules-engine id "${entry.id}"`,
  );
  assert.equal(
    findingRegex.test(seedSql),
    true,
    `initial seed missing trigger_finding "${entry.trigger_finding}" for "${entry.id}"`,
  );

  // Extension seed: same fields must be present so plan.ts's DB read path
  // matches all 14 findings. If either check fails, the engine will silently
  // drop that intervention from users on the DB-backed path.
  assert.equal(
    codeRegex.test(extendSql),
    true,
    `extended seed missing code for rules-engine id "${entry.id}"`,
  );
  assert.equal(
    findingRegex.test(extendSql),
    true,
    `extended seed missing trigger_finding "${entry.trigger_finding}" for "${entry.id}"`,
  );

  // Category and plain_reason must also appear in the extended seed —
  // toEngineTemplate drops any row missing either.
  const categoryRegex = new RegExp(`'${escapeRe(entry.category)}'`);
  assert.equal(
    categoryRegex.test(extendSql),
    true,
    `extended seed missing category "${entry.category}" (needed for "${entry.id}")`,
  );

  const plainReasonRegex = new RegExp(
    `'${escapeRe(entry.plain_reason.replace(/'/g, "''"))}'`,
  );
  // fasting_insulin's plain_reason interpolates a live threshold, so the
  // seed carries a deliberately different generic string. Skip the exact
  // check for that id — the extended seed still fills plain_reason.
  if (entry.id !== "fasting_insulin") {
    assert.equal(
      plainReasonRegex.test(extendSql),
      true,
      `extended seed missing plain_reason for "${entry.id}"`,
    );
  }
}

function escapeRe(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// eslint-disable-next-line no-console
console.log("intervention-templates-seed.test.ts OK");
