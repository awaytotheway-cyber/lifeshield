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
      if (!/<ScrollView/.test(src) || /<FlatList|<SectionList/.test(src)) return false;
      // A ScrollView explicitly argued for in a comment just above is allowed.
      const lines = src.split("\n");
      const near = lines.slice(Math.max(0, n - 12), n).join("\n");
      return !/ScrollView is deliberate/.test(near);
    },
  },
  {
    id: "card-radius",
    severity: 2,
    label: "Card using the button corner (surfaces are rounded-2xl, not rounded-xl)",
    // Inputs legitimately keep the 12px corner, so a line that is clearly a
    // field (a TextInput, a fixed-height multiline box, or a picker trigger)
    // is not a card wearing the wrong radius.
    test: (line, n, src) => {
      if (!/\brounded-xl\b/.test(line)) return false;
      if (!/\bbg-(white|cream|iceBlue)\b/.test(line)) return false;
      if (!/\b(p|px|py)-\d/.test(line)) return false;
      const lines = src.split("\n");
      const near = lines.slice(Math.max(0, n - 6), n + 1).join("\n");
      if (/<TextInput|<NumberInput|min-h-\[/.test(near)) return false;
      if (/placeholder|keyboardType|accessibilityLabel=\{label\}/.test(near)) return false;
      return true;
    },
  },
  {
    id: "semantic-border",
    severity: 2,
    label: "Status colour used as a neutral border (use border-border; keep sage/coral/amber for state)",
    test: (line) =>
      /\bborder-(sage|teal|deepTeal|midTeal|skyBlue)\b/.test(line)
      && /\bbg-(white|cream|iceBlue)\b/.test(line),
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
    // Status chips are the sanctioned exception, so a style block that says it
    // is a chip nearby is left alone. Keeping this comment-driven rather than
    // path-driven means a new violation in the same file is still caught.
    test: (line, n, src) => {
      if (!/textTransform:\s*["']uppercase["']/.test(line) && !/\buppercase\b/.test(line)) {
        return false;
      }
      const lines = src.split("\n");
      const near = lines.slice(Math.max(0, n - 5), n + 2).join("\n");
      return !/chip/i.test(near);
    },
  },
  {
    id: "risk-color-as-text",
    severity: 1,
    label: "Vivid risk colour used as text (use riskHighText/riskModerateText/riskLowText)",
    // The system Green/Yellow/Red are fill colours. As text on white they are
    // 2.22:1 and 1.51:1, well under WCAG AA's 4.5:1. Icons and fills may keep
    // them, so this only looks at text colours.
    test: (line) =>
      /\btext-(coral|sage|amber|riskHigh|riskLow|riskModerate)\b(?!Text|Light)/.test(line)
      || /\bcolor: colors\.(coral|sage|amber|riskHigh|riskLow|riskModerate)\b(?!Text|Light)/.test(line),
  },
  {
    id: "low-contrast-text",
    severity: 1,
    label: "Low-contrast colour used as text (skyBlue 2.44:1, mist 2.50:1 — decorative/placeholder only)",
    test: (line) =>
      /\btext-(skyBlue|midTeal)\b/.test(line)
      || /\bcolor: colors\.(skyBlue|midTeal)\b/.test(line),
  },
  {
    id: "system-font-text",
    severity: 1,
    label: "Text without a font family (renders in the platform system font)",
    // A Tailwind size class sets size but not family, and no font-* utilities
    // are configured, so a className-only Text silently falls back to the
    // system font. Use the components in components/ui/Typography.tsx.
    exempt: ["components/ui/Typography.tsx"],
    test: (line, n, src) => {
      const at = src.split("\n").slice(0, n).join("\n").length;
      const tag = /<Text\b[^>]*?>/g;
      tag.lastIndex = Math.max(0, at - line.length - 1);
      let m;
      while ((m = tag.exec(src)) !== null) {
        if (m.index > at) break;
        const end = m.index + m[0].length;
        if (m.index <= at && end >= at - line.length) {
          return !m[0].includes("style=");
        }
      }
      return false;
    },
  },
  {
    id: "inline-string",
    severity: 2,
    label: "Hardcoded user-facing string in JSX (move it to lib/copy.ts)",
    // Looks for prose rendered straight into a Text element or passed as a
    // title/label prop. Short symbols and single words are ignored, since
    // things like "+" or a unit are not copy.
    test: (line) => {
      const patterns = [
        /<Text[^>]*>\s*[A-Z][A-Za-z,'’]+(?:\s+[A-Za-z0-9,'’.&-]+){2,}/,
        /\b(?:title|label|placeholder|accessibilityHint)=["'][A-Z][A-Za-z,'’]+(?:\s+[A-Za-z0-9,'’.&-]+){2,}["']/,
      ];
      return patterns.some((re) => re.test(line));
    },
  },
  {
    id: "legacy-alias",
    severity: 1,
    label: "Removed colour alias (sage/coral/amber/teal/cream/deepTeal/midTeal) — use the real token name",
    // These aliases survived two palette migrations and stopped describing
    // their own values: deepTeal was #2B5FE0 blue, cream was iceBlue, and sage
    // became the vivid iOS green, which is how a progress-bar track ended up
    // bright green. One name per colour now.
    test: (line) =>
      /\b(?:bg|text|border)-(?:deepTeal|midTeal|teal|cream|sage|coral|amber)\b(?!Light)/.test(line)
      || /\bcolors\.(?:deepTeal|midTeal|teal|cream|sage|coral|amber)\b(?!Light)/.test(line),
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
