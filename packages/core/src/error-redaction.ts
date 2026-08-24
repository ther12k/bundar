/**
 * Error redaction policy (BR-067).
 *
 * Production diagnostics must omit: cookies/session identifiers, CSRF
 * secrets, authorization data, raw bodies/uploads, filesystem paths, and
 * stack traces. Development keeps full detail. Redaction is applied at
 * the ONE boundary — helpers here are never bypassed by route code.
 */

const SENSITIVE_KEYS = new Set([
  "cookie",
  "cookies",
  "set-cookie",
  "authorization",
  "x-csrf-token",
  "csrf",
  "csrftoken",
  "csrf_token",
  "_csrf",
  "password",
  "secret",
  "token",
  "sessionid",
  "session_id",
  "session",
]);

/** Filesystem-path-like strings (posix + windows + bundar-relative). */
const PATH_LIKE =
  /(?:[A-Za-z]:\\|\/(?:home|Users|root|app|var|tmp|usr|private)(?:\/[\w.-]+)+)|(?:\.{1,2}\/[\w./-]+)/g;

/** Generates a short correlation ID safe for headers and logs. */
export function generateErrorId(): string {
  const uuid = globalThis.crypto.randomUUID();
  return `err_${uuid.replace(/-/g, "").slice(0, 16)}`;
}

function redactString(value: string): string {
  return value.replace(PATH_LIKE, "[path]");
}

function redactValue(value: unknown, depth: number): unknown {
  if (depth > 6) return "[truncated]";
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map((v) => redactValue(v, depth + 1));
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      out[key] = SENSITIVE_KEYS.has(key.toLowerCase())
        ? "[redacted]"
        : redactValue(child, depth + 1);
    }
    return out;
  }
  return value;
}

/**
 * Deeply redacts a details payload: sensitive keys replaced wholesale,
 * filesystem paths masked, structure preserved.
 */
export function redactDetails<T>(details: T): unknown {
  try {
    return JSON.parse(JSON.stringify(redactValue(details, 0))) as unknown;
  } catch {
    // non-JSON-safe details can never be safely exposed
    return "[unserializable]";
  }
}

/** Stack exposure gate: production responses carry no stacks. */
export function sanitizeStack(
  stack: string | undefined,
  development: boolean,
): string | undefined {
  if (!development) return undefined;
  return stack;
}
