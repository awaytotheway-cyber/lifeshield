/**
 * Checks the save-error wording helpers.
 * Run: npx --yes tsx --tsconfig tsconfig.json lib/result-entry.test.ts
 */
import assert from "node:assert/strict";

import {
  looksLikeMissingRpc,
  looksLikeUnreachableFunction,
} from "./result-entry-errors";

let passed = 0;

function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}

check("invoke network failure is unreachable", () => {
  assert.equal(
    looksLikeUnreachableFunction(
      new Error("Failed to send a request to the Edge Function"),
    ),
    true,
  );
});

check("function not found is unreachable", () => {
  assert.equal(
    looksLikeUnreachableFunction({ message: "Requested function was not found" }),
    true,
  );
});

check("404 status is unreachable", () => {
  assert.equal(looksLikeUnreachableFunction({}, 404), true);
});

check("permission error is not treated as missing function", () => {
  assert.equal(
    looksLikeUnreachableFunction({
      message: "This account is not allowed to enter results.",
    }),
    false,
  );
});

check("missing RPC is detected", () => {
  assert.equal(
    looksLikeMissingRpc({
      message: "Could not find the function public.save_reviewed_result in the schema cache",
      code: "PGRST202",
    }),
    true,
  );
});

check("unrelated RPC error is not missing", () => {
  assert.equal(
    looksLikeMissingRpc({ message: "This account is not allowed to enter results." }),
    false,
  );
});

console.log(`\n${passed} checks passed`);
