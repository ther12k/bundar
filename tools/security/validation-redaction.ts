/**
 * Validation redaction audit (GH-059).
 *
 * Fail-closed runtime proof that sensitive submitted values can never reach
 * rendered models or logs through the validation pipeline:
 *
 * 1. plants a secret in every documented sensitive key, builds the
 *    field-error model, and asserts the serialized model contains none of
 *    the planted secrets;
 * 2. asserts uploaded/byte content is dropped alongside secrets while safe
 *    values survive;
 * 3. statically verifies @bundar/schema and @bundar/jsx sources contain no
 *    direct logging calls that could bypass the redaction boundary.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  redactSubmitted,
  SENSITIVE_FIELD_KEYS,
  toFieldErrors,
} from "../../packages/schema/src/index";

const ROOT = join(import.meta.dir, "../..");
const failures: string[] = [];

// 1. runtime redaction across the full sensitive-key policy
const planted: Record<string, unknown> = {};
for (const key of SENSITIVE_FIELD_KEYS) planted[key] = `secret-${key}`;
planted.name = "Bundar";

const model = toFieldErrors(
  {
    success: false,
    issues: [{ message: "required", path: ["name"] }],
  },
  { submitted: planted },
);
const serialized = JSON.stringify(model);
for (const key of SENSITIVE_FIELD_KEYS) {
  if (serialized.includes(`secret-${key}`)) {
    failures.push(`sensitive value leaked through the error model: ${key}`);
  }
}

// 2. uploaded/byte content is never retained; safe values survive
const withFiles = redactSubmitted({
  name: "Bundar",
  avatar: new Uint8Array([1, 2, 3]),
  secret: new Uint8Array([9]),
});
if ("avatar" in withFiles || "secret" in withFiles) {
  failures.push("byte content was retained in redacted submitted values");
}
if (withFiles.name !== "Bundar") {
  failures.push("safe values were dropped by redaction");
}

// 3. no direct logging in the validation/rendering sources
function walk(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...walk(path));
    else if (/\.tsx?$/.test(entry.name)) found.push(path);
  }
  return found;
}
const LOG_CALL = /console\.(log|info|warn|error|debug|trace)\s*\(/;
for (const source of [
  ...walk(join(ROOT, "packages/schema/src")),
  ...walk(join(ROOT, "packages/jsx/src")),
]) {
  const text = readFileSync(source, "utf8");
  for (const [index, line] of text.split("\n").entries()) {
    if (LOG_CALL.test(line)) {
      failures.push(
        `${source.slice(ROOT.length + 1)}:${index + 1}: direct logging call — route through the app boundary so redaction applies`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("security:validation-redaction: FAILED");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  `security:validation-redaction: ok (${SENSITIVE_FIELD_KEYS.length} sensitive keys planted and absent; byte content dropped; no direct logging in schema/jsx sources)`,
);
