/**
 * Local check before an iOS EAS command.
 * Does not print or upload the .p8 key contents.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const p8Path = resolve(root, "AuthKey.p8");
const easPath = resolve(root, "eas.json");

let issuerId = "";
let keyId = "";
try {
  const eas = JSON.parse(readFileSync(easPath, "utf8"));
  issuerId = String(eas.submit?.production?.ios?.ascApiKeyIssuerId ?? "");
  keyId = String(eas.submit?.production?.ios?.ascApiKeyId ?? "");
} catch {
  issuerId = "";
  keyId = "";
}

const p8Exists = existsSync(p8Path);
const p8Bytes = p8Exists ? statSync(p8Path).size : 0;
const envPathSet = Boolean(process.env.EXPO_ASC_API_KEY_PATH);
const envIssuerSet = Boolean(process.env.EXPO_ASC_API_KEY_ISSUER_ID);
const envKeyIdSet = Boolean(process.env.EXPO_ASC_API_KEY_ID);
const envCiIssuerSet = Boolean(process.env.EXPO_ASC_ISSUER_ID);
const envCiKeyIdSet = Boolean(process.env.EXPO_ASC_KEY_ID);
const envTeamIdSet = Boolean(process.env.EXPO_APPLE_TEAM_ID);

const payload = {
  sessionId: "12087a",
  runId: "pre-fix",
      hypothesisId: "I",
  location: "scripts/check-apple-eas.mjs",
  message: "EAS Apple auth config (no secrets)",
  data: {
    p8Exists,
    p8Bytes,
    issuerIdLength: issuerId.length,
    keyIdTail: keyId.slice(-4),
        envPathSet,
        envIssuerSet,
        envKeyIdSet,
        envCiIssuerSet,
        envCiKeyIdSet,
        envTeamIdSet,
        platform: process.platform,
  },
  timestamp: Date.now(),
};

try {
  await fetch("http://127.0.0.1:7554/ingest/75cabbda-8d85-435d-83dc-32c8a4a4e89f", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "12087a",
    },
    body: JSON.stringify(payload),
  });
} catch {
  // Debug ingest is optional.
}

console.log("Apple/EAS check (safe to share):");
console.log(`  AuthKey.p8 present: ${p8Exists} (${p8Bytes} bytes)`);
console.log(`  eas.json issuer id length: ${issuerId.length}`);
console.log(`  eas.json key id ends with: ${keyId.slice(-4) || "(missing)"}`);
console.log(`  EXPO_ASC_API_KEY_PATH set: ${envPathSet}`);
console.log(`  EXPO_ASC_API_KEY_ISSUER_ID set: ${envIssuerSet}`);
console.log(`  EXPO_ASC_API_KEY_ID set: ${envKeyIdSet}`);
console.log(`  EXPO_ASC_ISSUER_ID (CI name) set: ${envCiIssuerSet}`);
console.log(`  EXPO_ASC_KEY_ID (CI name) set: ${envCiKeyIdSet}`);
console.log(`  EXPO_APPLE_TEAM_ID set: ${envTeamIdSet}`);
console.log(
  "\npreview = ad hoc. That needs a registered iPhone.\nFor TestFlight use: eas build --platform ios --profile testflight --non-interactive --no-wait",
);
