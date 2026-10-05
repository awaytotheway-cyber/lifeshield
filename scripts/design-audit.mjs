#!/usr/bin/env node
/**
 * PRESCOPE design-system audit.
 *
 * Flags the anti-patterns listed in .cursorrules-design so a retrofit can be
 * driven by real violations instead of guesswork. Run it with:
 *
 *   node scripts/design-audit.mjs            # grouped summary
 *   node scripts/design-audit.mjs --files     # per-file worklist
 *   node scripts/design-audit.mjs --rule hex  # one rule, with line numbers
 *
 * It is a lint-style heuristic, not a compiler: skim the hits before fixing.
 */

import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { execSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;

// Token files are allowed to contain raw hex — they define the palette.
const TOKEN_FILES = [
  "lib/design-tokens.ts",
  "lib/typography.ts",
  "lib/switch-colors.ts",
  "tailwind.config.js",
  "global.css",
];

const files = execSync(
  "find app components -name '*.tsx' -o -name '*.ts' | sort",
  { cwd: ROOT, encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean)
  .filter((f) => !TOKEN_FILES.includes(f));

/**
 * Each rule gets a severity so the worklist can be ordered:
 * 1 = breaks the design system visibly, 2 = polish, 3 = hygiene.
 */
const RULES = [
  {
    id: "hex",
    severity: 1,
    label: "Hardcoded hex colour (use a token from lib/design-tokens.ts)",
    test: (line) => /#[0-9a-fA-F]{3,8}\b/.test(line) && !/^\s*(\/\/|\*|\/\*)/.test(line),
  },
  {
    id: "gray-bg",
    severity: 1,
    label: "Gray background (use iceBlue or white)",
    test: (line) => /#(f5f5f5|eee|eeeeee|fafafa|f0f0f0|f2f2f7|e5e5ea)\b/i.test(line)
      || /bg-(gray|neutral|zinc|slate)-\d/.test(line),
  },
  {
    id: "black-text",
    severity: 1,
    label: "Pure black / plain black shadow (use deepNavy or a blue-tinted shadow)",
    test: (line) => /#000000?\b/.test(line) || /["']black["']/.test(line)
      || /rgba\(\s*0\s*,\s*0\s*,\s*0/.test(line),
  },
  {
    id: "rn-image",
    severity: 1,
    label: "Image from react-native (use expo-image)",
    test: (line, _n, src) =>
      /^\s*import\s*\{[^}]*\bImage\b[^}]*\}\s*from\s*["']react-native["']/.test(line)
      && !src.includes('from "expo-image"'),
  },
  {
    id: "activity-indicator",
    severity: 1,
    label: "Raw ActivityIndicator (use a shimmer skeleton)",
    // A spinner is correct in three places, so they are exempt by path:
    //  - inside a button that is mid-submit (no layout to ghost, fixed footprint)
    //  - the font/splash gate, before any screen exists
    //  - a route gate, where the destination layout is not yet known
    // Everything else waiting on data owes the user a shimmer skeleton.
    exempt: [
      "components/ui/Button.tsx",
      "app/_layout.tsx",
      "components/journey/PostAuthRedirect.tsx",
    ],
    test: (line) => /<ActivityIndicator/.test(line),
  },
  {
    id: "scroll-map",
    severity: 2,
    label: "ScrollView + .map() for a list (use FlatList/SectionList)",
    test: (line, n, src) => {
      if (!/\.map\(/.test(line)) return false;
      // Only flag when a ScrollView wraps this file's list rendering.
      return /<ScrollView/.test(src) && !/<FlatList|<SectionList/.test(src);
    },
  },
  {
    id: "screen-padding",
    severity: 2,
    label: "Screen padding px-4/px-8 (screens use px-5 = 20px)",
    test: (line) => /className=["'][^"']*\bpx-(4|8)\b/.test(line),
  },
  {
    id: "radius",
    severity: 2,
    label: "Off-system radius (cards rounded-2xl, buttons/inputs rounded-xl, chips rounded-full)",
    test: (line) => /\brounded-(sm|md|lg|3xl)\b/.test(line)
      && !/rounded-t-3xl/.test(line),
  },
  {
    id: "scroll-indicator",
    severity: 2,
    label: "ScrollView without showsVerticalScrollIndicator={false}",
    test: (line, n, src) =>
      /<ScrollView/.test(line) && !/showsVerticalScrollIndicator/.test(src),
  },
  {
    id: "all-caps",
    severity: 2,
    label: "ALL CAPS text (sentence case everywhere except 1-2 word status chips)",
    test: (line) => /textTransform:\s*["']uppercase["']/.test(line)
      || /\buppercase\b/.test(line),
  },
  {
    id: "console",
    severity: 3,
    label: "console.log left in a component",
    test: (line) => /console\.(log|debug)\(/.test(line),
  },
];

const hits = new Map(); // ruleId -> [{file, line, text}]
for (const r of RULES) hits.set(r.id, []);

for (const file of files) {
  const src = readFileSync(ROOT + file, "utf8");
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      if (rule.exempt?.includes(file)) continue;
      if (rule.test(line, i + 1, src)) {
        hits.get(rule.id).push({ file, line: i + 1, text: line.trim().slice(0, 100) });
      }
    }
  });
}

const args = process.argv.slice(2);
const only = args.includes("--rule") ? args[args.indexOf("--rule") + 1] : null;

if (only) {
  const rule = RULES.find((r) => r.id === only);
  console.log(`\n${rule.id} — ${rule.label}\n`);
  for (const h of hits.get(only)) console.log(`  ${h.file}:${h.line}  ${h.text}`);
  console.log(`\n  ${hits.get(only).length} hit(s)\n`);
  process.exit(0);
}

if (args.includes("--files")) {
  // Per-file worklist, worst first, so a retrofit can go file by file.
  const perFile = new Map();
  for (const rule of RULES) {
    for (const h of hits.get(rule.id)) {
      if (!perFile.has(h.file)) perFile.set(h.file, { score: 0, rules: new Map() });
      const e = perFile.get(h.file);
      e.score += 4 - rule.severity;
      e.rules.set(rule.id, (e.rules.get(rule.id) ?? 0) + 1);
    }
  }
  const sorted = [...perFile.entries()].sort((a, b) => b[1].score - a[1].score);
  console.log(`\nPer-file worklist — ${sorted.length} file(s) with findings\n`);
  for (const [file, e] of sorted) {
    const detail = [...e.rules.entries()].map(([r, c]) => `${r}:${c}`).join(" ");
    console.log(`  ${String(e.score).padStart(4)}  ${file}\n        ${detail}`);
  }
  console.log();
  process.exit(0);
}

console.log(`\nPRESCOPE design audit — ${files.length} files scanned\n`);
let total = 0;
for (const rule of RULES.slice().sort((a, b) => a.severity - b.severity)) {
  const n = hits.get(rule.id).length;
  total += n;
  const filesAffected = new Set(hits.get(rule.id).map((h) => h.file)).size;
  console.log(
    `  [S${rule.severity}] ${String(n).padStart(4)} hits / ${String(filesAffected).padStart(3)} files  ${rule.id}`,
  );
  console.log(`              ${rule.label}`);
}
console.log(`\n  ${total} finding(s) total. Use --files for a worklist, --rule <id> for detail.\n`);
