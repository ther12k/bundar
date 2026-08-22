/**
 * Cookie-jar semantics for the in-process test client (GH-074).
 *
 * The jar models what a real browser does with `Set-Cookie`: later
 * assignments of the same name win, empty values clear the cookie, and the
 * next request replays everything as one `cookie` header. Jars are
 * per-client, so concurrent tests never share login state.
 */
export class CookieJar {
  private readonly cookies = new Map<string, string>();

  /** Absorbs every `Set-Cookie` of a response (last write wins). */
  public absorb(response: Response): this {
    for (const setCookie of response.headers.getSetCookie()) {
      const pair = setCookie.split(";")[0] ?? "";
      const eq = pair.indexOf("=");
      if (eq <= 0) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1);
      if (value.length === 0) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    return this;
  }

  /** The `cookie` header value for the next request ("" when empty). */
  public header(): string {
    return [...this.cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  public get(name: string): string | undefined {
    return this.cookies.get(name);
  }

  public set(name: string, value: string): this {
    this.cookies.set(name, value);
    return this;
  }

  public clear(): this {
    this.cookies.clear();
    return this;
  }

  public get size(): number {
    return this.cookies.size;
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
