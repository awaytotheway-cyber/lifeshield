/**
 * Aggregate test runner.
 *
 *   npm test
 *
 * Runs every `test:*` script in package.json, in declaration order, and keeps
 * going when one fails — an `&&` chain would stop at the first red suite and
 * hide every suite after it. Prints a PASS/FAIL line per suite, re-prints the
 * output of the failures, and exits non-zero if any suite failed.
 *
 * Suites are discovered from package.json, so a new suite joins the gate by
 * adding its `test:*` script and nothing else.
 *
 * Every script named `test:…` is discovered, with no exceptions — a suite that
 * silently never runs is worse than one that fails. npm must be spawned through
 * a shell (Windows refuses to exec `npm.cmd` directly), so a name that would be
 * reinterpreted by that shell is reported as a loud FAIL rather than executed.
 * Nothing is ever dropped without saying so.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Safe to hand to a shell as a bare argument. Dots, dashes and colons only. */
const SHELL_SAFE_NAME = /^test:[A-Za-z0-9][A-Za-z0-9:._-]*$/;

const root = resolve(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const scripts = pkg.scripts ?? {};

// Every `test:`-prefixed script, in declaration order. `test` itself is not
// prefixed, so the runner cannot recurse into itself.
const suites = Object.keys(scripts).filter(
  (name) => name.startsWith("test:") && name.length > "test:".length,
);

if (suites.length === 0) {
  console.error("No test:* scripts found in package.json.");
  process.exit(1);
}

const unrunnable = suites.filter((name) => !SHELL_SAFE_NAME.test(name));

console.log(`Running ${suites.length} suites\n`);

if (unrunnable.length > 0) {
  console.log(
    `  !!  ${unrunnable.length} suite name(s) cannot be passed to a shell safely.`,
  );
  console.log(`      They are counted as FAILURES below, not skipped.`);
  console.log(`      Rename them to letters, digits, '.', '-', '_' or ':'.\n`);
}

const failed = [];
const output = new Map();

for (const name of suites) {
  if (!SHELL_SAFE_NAME.test(name)) {
    failed.push(name);
    output.set(
      name,
      `Not executed: the script name contains a character that a shell would\n` +
        `reinterpret, and npm has to be spawned through a shell on Windows.\n` +
        `Rename the script to match ${SHELL_SAFE_NAME}.`,
    );
    console.log(`  FAIL  ${name.padEnd(32)} unsafe name, not executed`);
    continue;
  }

  const startedAt = Date.now();
  const run = spawnSync("npm", ["run", "--silent", name], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  const ok = run.status === 0;

  if (!ok) {
    failed.push(name);
    output.set(name, `${run.stdout ?? ""}${run.stderr ?? ""}`.trimEnd());
  }

  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name.padEnd(32)} ${seconds}s`);
}

if (failed.length > 0) {
  for (const name of failed) {
    console.log(`\n${"-".repeat(70)}\nFAIL  ${name}\n${"-".repeat(70)}`);
    console.log(output.get(name) || "(no output captured)");
  }
}

const passed = suites.length - failed.length;
console.log(`\n${"=".repeat(70)}`);
console.log(`${passed} passed, ${failed.length} failed, ${suites.length} total`);

if (failed.length > 0) {
  console.log(`\nFailing suites:`);
  for (const name of failed) console.log(`  - ${name}`);
  console.log(`\nRe-run one with: npm run <suite>`);
  console.log("=".repeat(70));
  process.exit(1);
}

console.log("=".repeat(70));
