/**
 * Safe response mutation helpers (BR-054).
 *
 * Add cookies/headers to buffered or streaming Responses WITHOUT manually
 * rebuilding them. Every helper preserves status, status text, body
 * identity, and header multiplicity, and fails CLEARLY when mutation is
 * impossible because the body is already consumed or the stream committed.
 */

export type HeaderMode = "set" | "append";

export class ResponseMutationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ResponseMutationError";
  }
}

// eslint-disable-next-line no-control-regex -- intentional: detects injection
const HEADER_CONTROL = /[\u0000-\u001f\u007f\u0080-\u009f]/;

function assertHeaderValue(value: string): void {
  if (HEADER_CONTROL.test(value)) {
    throw new ResponseMutationError(
      "header value contains control characters (header injection)",
    );
  }
}

function assertMutable(response: Response): void {
  if (response.bodyUsed) {
    throw new ResponseMutationError(
      "cannot mutate response: body already consumed (stream committed)",
    );
  }
}

function rebuilt(
  response: Response,
  mutate: (headers: Headers) => void,
): Response {
  assertMutable(response);
  const headers = new Headers(response.headers);
  mutate(headers);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Appends (default) or replaces a single header value. */
export function withHeader(
  response: Response,
  name: string,
  value: string,
  mode: HeaderMode = "append",
): Response {
  return rebuilt(response, (headers) => {
    assertHeaderValue(value);
    if (mode === "set") headers.set(name, value);
    else headers.append(name, value);
  });
}

/** Applies multiple explicit header mutations in order. */
export function withHeaderEntries(
  response: Response,
  entries: readonly {
    name: string;
    value: string;
    mode?: HeaderMode;
  }[],
): Response {
  return rebuilt(response, (headers) => {
    for (const entry of entries) assertHeaderValue(entry.value);
    for (const entry of entries) {
      if ((entry.mode ?? "append") === "set")
        headers.set(entry.name, entry.value);
      else headers.append(entry.name, entry.value);
    }
  });
}

/** Deletes every values of a header (e.g. superseding a Set-Cookie). */
export function withoutHeader(response: Response, name: string): Response {
  return rebuilt(response, (headers) => {
    headers.delete(name);
  });
}

export interface CookieOptions {
  readonly expires?: Date;
  readonly maxAge?: number;
  readonly path?: string;
  readonly domain?: string;
  readonly httpOnly?: boolean;
  readonly sameSite?: "Strict" | "Lax" | "None";
  readonly secure?: boolean;
}

/** Minimal RFC6265 serializer; attribute order is deterministic. */
export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): string {
  if (/[;,\s]/.test(name) || value.includes(";")) {
    throw new ResponseMutationError("invalid cookie name/value characters");
  }
  const parts = [`${name}=${value}`];
  parts.push(`Path=${options.path ?? "/"}`);
  if (options.expires !== undefined)
    parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.domain !== undefined) parts.push(`Domain=${options.domain}`);
  // Deterministic attribute order: HttpOnly, Secure, SameSite last.
  const flags: string[] = [];
  if (options.httpOnly ?? true) flags.push("HttpOnly");
  if (options.secure) flags.push("Secure");
  if (options.sameSite !== undefined)
    flags.push(`SameSite=${options.sameSite}`);
  return [...parts, ...flags].join("; ");
}

/**
 * Appends a Set-Cookie while optionally REPLACING prior same-name cookies —
 * duplicate names make jar semantics ambiguous for clients (BR-056 lesson
 * from the Todo synchronizer-token flow).
 */
export function withSetCookie(
  response: Response,
  cookie: string | { name: string; value: string; options?: CookieOptions },
  options: { replaceSameName?: boolean } = {},
): Response {
  const serialized =
    typeof cookie === "string"
      ? cookie
      : serializeCookie(cookie.name, cookie.value, cookie.options);
  const name = serialized.slice(0, Math.max(0, serialized.indexOf("=")));
  return rebuilt(response, (headers) => {
    if (options.replaceSameName === true) {
      const existing = headers.getSetCookie();
      headers.delete("set-cookie");
      for (const value of existing) {
        if (!value.startsWith(`${name}=`)) headers.append("set-cookie", value);
      }
    }
    headers.append("set-cookie", serialized);
  });
}
