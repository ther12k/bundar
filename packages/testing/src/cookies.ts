/**
 * Cookie-jar semantics for the in-process test client (GH-074 / BR-092 / BR-109).
 *
 * The jar models what a real browser does with `Set-Cookie`:
 * - Cookie identity is keyed by (name, domain/hostOnly, path);
 * - Multiple cookies with the same name across different paths/domains coexist;
 * - Host-only cookies (no Domain attribute) only match the exact originating host;
 * - Path, Domain, Secure, and Expires/Max-Age attributes are parsed and respected;
 * - Output cookie headers sort by longest/most-specific path first (RFC 6265 §5.4).
 *
 * Jars are per-client, so concurrent tests never share login state.
 */

export interface CookieRecord {
  readonly name: string;
  readonly value: string;
  readonly expiresAtMs?: number;
  readonly path: string;
  readonly domain?: string;
  readonly hostOnly: boolean;
  readonly hostOnlyOrigin?: string;
  readonly secure: boolean;
  readonly httpOnly: boolean;
  readonly sameSite?: "Strict" | "Lax" | "None";
}

function parseSetCookie(
  header: string,
  requestUrl?: string | URL,
): CookieRecord | null {
  const parts = header.split(";").map((p) => p.trim());
  const pair = parts[0] ?? "";
  const eq = pair.indexOf("=");
  if (eq <= 0) return null;
  const name = pair.slice(0, eq).trim();
  const value = pair.slice(eq + 1);
  if (!name) return null;

  let expiresAtMs: number | undefined;
  let maxAgeSeconds: number | undefined;
  let path: string | undefined;
  let domain: string | undefined;
  let secure = false;
  let httpOnly = false;
  let sameSite: "Strict" | "Lax" | "None" | undefined;

  for (let i = 1; i < parts.length; i += 1) {
    const part = parts[i]!;
    const separator = part.indexOf("=");
    const key = (separator === -1 ? part : part.slice(0, separator))
      .trim()
      .toLowerCase();
    const val = separator === -1 ? "" : part.slice(separator + 1).trim();

    if (key === "expires") {
      const parsedTime = Date.parse(val);
      if (!Number.isNaN(parsedTime)) {
        expiresAtMs = parsedTime;
      }
    } else if (key === "max-age") {
      const parsedAge = Number.parseInt(val, 10);
      if (!Number.isNaN(parsedAge)) {
        maxAgeSeconds = parsedAge;
      }
    } else if (key === "path") {
      path = val || "/";
    } else if (key === "domain") {
      domain = val.toLowerCase().replace(/^\./, "");
    } else if (key === "secure") {
      secure = true;
    } else if (key === "httponly") {
      httpOnly = true;
    } else if (key === "samesite") {
      const lower = val.toLowerCase();
      if (lower === "strict") sameSite = "Strict";
      else if (lower === "none") sameSite = "None";
      else sameSite = "Lax";
    }
  }

  // RFC 6265: Max-Age takes precedence over Expires
  if (maxAgeSeconds !== undefined) {
    expiresAtMs = Date.now() + maxAgeSeconds * 1000;
  }

  let hostOnlyOrigin: string | undefined;
  if (requestUrl) {
    try {
      const u =
        typeof requestUrl === "string"
          ? new URL(requestUrl, "http://localhost")
          : requestUrl;
      hostOnlyOrigin = u.hostname.toLowerCase();
      if (!path) {
        const pathname = u.pathname;
        const lastSlash = pathname.lastIndexOf("/");
        path = lastSlash <= 0 ? "/" : pathname.slice(0, lastSlash);
      }
    } catch {
      hostOnlyOrigin = "localhost";
      path = path ?? "/";
    }
  }

  return {
    name,
    value,
    expiresAtMs,
    path: path ?? "/",
    domain,
    hostOnly: domain === undefined,
    hostOnlyOrigin,
    secure,
    httpOnly,
    sameSite,
  };
}

function pathMatches(requestPath: string, cookiePath: string): boolean {
  if (requestPath === cookiePath) return true;
  if (requestPath.startsWith(cookiePath)) {
    if (cookiePath.endsWith("/")) return true;
    if (requestPath[cookiePath.length] === "/") return true;
  }
  return false;
}

function hostMatches(requestHost: string, record: CookieRecord): boolean {
  const host = requestHost.toLowerCase().split(":")[0]!;
  if (record.hostOnly) {
    // Host-only cookies must strictly match the originating hostname
    return (
      record.hostOnlyOrigin === undefined || host === record.hostOnlyOrigin
    );
  }
  if (record.domain) {
    return host === record.domain || host.endsWith(`.${record.domain}`);
  }
  return true;
}

function cookieKey(record: {
  name: string;
  domain?: string;
  hostOnlyOrigin?: string;
  path: string;
}): string {
  const origin = record.domain ?? record.hostOnlyOrigin ?? "";
  return `${record.name}\0${origin}\0${record.path}`;
}

export class CookieJar {
  private readonly records = new Map<string, CookieRecord>();

  /** Absorbs every `Set-Cookie` of a response (browser identity keying). */
  public absorb(response: Response, requestUrl?: string | URL): this {
    for (const setCookie of response.headers.getSetCookie()) {
      const record = parseSetCookie(setCookie, requestUrl);
      if (!record) continue;
      const key = cookieKey(record);
      // Empty value or past expiry immediately removes the cookie
      if (
        record.value.length === 0 ||
        (record.expiresAtMs !== undefined && record.expiresAtMs <= Date.now())
      ) {
        this.records.delete(key);
      } else {
        this.records.set(key, record);
      }
    }
    return this;
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (record.expiresAtMs !== undefined && record.expiresAtMs <= now) {
        this.records.delete(key);
      }
    }
  }

  /** The `cookie` header value for the next request, sorted by path length descending. */
  public header(requestUrl?: string | URL): string {
    this.purgeExpired();
    if (!requestUrl) {
      return [...this.records.values()]
        .map((r) => `${r.name}=${r.value}`)
        .join("; ");
    }
    const url =
      typeof requestUrl === "string"
        ? new URL(requestUrl, "http://localhost")
        : requestUrl;
    const requestPath = url.pathname || "/";
    const requestHost = url.hostname || "localhost";
    const isSecure = url.protocol === "https:";
    const isLocalTest =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.endsWith(".invalid");

    const matched: CookieRecord[] = [];
    for (const record of this.records.values()) {
      if (!pathMatches(requestPath, record.path)) continue;
      if (!hostMatches(requestHost, record)) continue;
      if (record.secure && !isSecure && !isLocalTest) {
        continue;
      }
      matched.push(record);
    }

    // RFC 6265 §5.4: sort cookies with longer/more-specific paths first
    matched.sort((a, b) => b.path.length - a.path.length);

    return matched.map((r) => `${r.name}=${r.value}`).join("; ");
  }

  public get(name: string): string | undefined {
    this.purgeExpired();
    // Return longest path match for this name
    const matches = [...this.records.values()]
      .filter((r) => r.name === name)
      .sort((a, b) => b.path.length - a.path.length);
    return matches[0]?.value;
  }

  public getRecord(name: string): CookieRecord | undefined {
    this.purgeExpired();
    const matches = [...this.records.values()]
      .filter((r) => r.name === name)
      .sort((a, b) => b.path.length - a.path.length);
    return matches[0];
  }

  public set(
    name: string,
    value: string,
    attributes: Partial<Omit<CookieRecord, "name" | "value">> = {},
  ): this {
    const record: CookieRecord = {
      name,
      value,
      path: attributes.path ?? "/",
      hostOnly: attributes.domain === undefined,
      secure: false,
      httpOnly: false,
      ...attributes,
    };
    const key = cookieKey(record);
    if (
      value.length === 0 ||
      (attributes.expiresAtMs !== undefined &&
        attributes.expiresAtMs <= Date.now())
    ) {
      this.records.delete(key);
      return this;
    }
    this.records.set(key, record);
    return this;
  }

  public clear(): this {
    this.records.clear();
    return this;
  }

  public get size(): number {
    this.purgeExpired();
    return this.records.size;
  }

  public entries(): [string, string][] {
    this.purgeExpired();
    return [...this.records.values()].map((r) => [r.name, r.value]);
  }
}

/** Parses a response's cookies into a map (no jar state). */
export function responseCookies(response: Response): Map<string, string> {
  const parsed = new Map<string, string>();
  for (const setCookie of response.headers.getSetCookie()) {
    const pair = setCookie.split(";")[0] ?? "";
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    parsed.set(pair.slice(0, eq).trim(), pair.slice(eq + 1));
  }
  return parsed;
}
