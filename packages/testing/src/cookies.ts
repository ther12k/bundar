/**
 * Cookie-jar semantics for the in-process test client (GH-074 / BR-092).
 *
 * The jar models what a real browser does with `Set-Cookie`:
 * - Later assignments of the same name win;
 * - Empty values or expired dates (`Expires` in the past / `Max-Age=0`) clear the cookie;
 * - Path, Domain, Secure, and Expires/Max-Age attributes are parsed and respected;
 * - Requests only receive unexpired cookies matching their Path/Domain/Scheme.
 *
 * Jars are per-client, so concurrent tests never share login state.
 */

export interface CookieRecord {
  readonly name: string;
  readonly value: string;
  readonly expiresAtMs?: number;
  readonly path?: string;
  readonly domain?: string;
  readonly secure?: boolean;
  readonly httpOnly?: boolean;
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

  // Default path if not specified
  if (!path && requestUrl) {
    try {
      const u =
        typeof requestUrl === "string"
          ? new URL(requestUrl, "http://localhost")
          : requestUrl;
      const pathname = u.pathname;
      const lastSlash = pathname.lastIndexOf("/");
      path = lastSlash <= 0 ? "/" : pathname.slice(0, lastSlash);
    } catch {
      path = "/";
    }
  }

  return {
    name,
    value,
    expiresAtMs,
    path: path ?? "/",
    domain,
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

function domainMatches(requestHost: string, cookieDomain?: string): boolean {
  if (!cookieDomain) return true;
  const host = requestHost.toLowerCase().split(":")[0]!;
  return host === cookieDomain || host.endsWith(`.${cookieDomain}`);
}

export class CookieJar {
  private readonly records = new Map<string, CookieRecord>();

  /** Absorbs every `Set-Cookie` of a response (last write wins, expired removed). */
  public absorb(response: Response, requestUrl?: string | URL): this {
    for (const setCookie of response.headers.getSetCookie()) {
      const record = parseSetCookie(setCookie, requestUrl);
      if (!record) continue;
      // Empty value or past expiry immediately removes the cookie
      if (
        record.value.length === 0 ||
        (record.expiresAtMs !== undefined && record.expiresAtMs <= Date.now())
      ) {
        this.records.delete(record.name);
      } else {
        this.records.set(record.name, record);
      }
    }
    return this;
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [name, record] of this.records.entries()) {
      if (record.expiresAtMs !== undefined && record.expiresAtMs <= now) {
        this.records.delete(name);
      }
    }
  }

  /** The `cookie` header value for the next request ("" when empty). */
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
    const requestHost = url.host || "localhost";
    const isSecure = url.protocol === "https:";
    const isLocalTest =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.endsWith(".invalid");

    const matched: string[] = [];
    for (const record of this.records.values()) {
      if (record.path && !pathMatches(requestPath, record.path)) continue;
      if (record.domain && !domainMatches(requestHost, record.domain)) continue;
      if (record.secure && !isSecure && !isLocalTest) {
        continue;
      }
      matched.push(`${record.name}=${record.value}`);
    }
    return matched.join("; ");
  }

  public get(name: string): string | undefined {
    this.purgeExpired();
    return this.records.get(name)?.value;
  }

  public getRecord(name: string): CookieRecord | undefined {
    this.purgeExpired();
    return this.records.get(name);
  }

  public set(
    name: string,
    value: string,
    attributes: Partial<Omit<CookieRecord, "name" | "value">> = {},
  ): this {
    if (
      value.length === 0 ||
      (attributes.expiresAtMs !== undefined &&
        attributes.expiresAtMs <= Date.now())
    ) {
      this.records.delete(name);
      return this;
    }
    this.records.set(name, {
      name,
      value,
      path: attributes.path ?? "/",
      ...attributes,
    });
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
