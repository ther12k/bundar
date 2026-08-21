/**
 * Params, query, and cookie access adapters (GH-019).
 *
 * Typed access over the context's native data: params are Bun-decoded route
 * values; query is a lazy URLSearchParams wrapper preserving repeated keys;
 * cookies wrap the Cookie header with an explicit response mutation
 * mechanism (Set-Cookie collected on the context, applied by the handler via
 * `withCookies`). No body parsing ever occurs here. Signed-cookie semantics
 * are deferred to GH-062 by scope decision.
 */
import type { Context } from "../context";

/** Typed param access over the context's native params record. */
export function param(context: Context, name: string): string | undefined {
  const value = (context.params as Record<string, string>)[name];
  return value;
}

/** Param that must exist — throws a descriptive error when absent. */
export function requiredParam(context: Context, name: string): string {
  const value = param(context, name);
  if (value === undefined) {
    throw new Error(
      `route parameter "${name}" is absent; the route pattern must declare ":${name}" for this handler`,
    );
  }
  return value;
}

/** Integer-coerced param; throws on non-numeric values. */
export function intParam(context: Context, name: string): number {
  const value = requiredParam(context, name);
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || String(parsed) !== value.trim()) {
    throw new Error(
      `route parameter "${name}" value "${value}" is not an integer`,
    );
  }
  return parsed;
}

/** Lazy query adapter preserving repeated keys. */
export interface QueryAdapter {
  get(name: string): string | null;
  getAll(name: string): readonly string[];
  has(name: string): boolean;
  readonly size: number;
}

export function queryAdapter(context: Context): QueryAdapter {
  let params: URLSearchParams | undefined;
  const ensure = (): URLSearchParams => {
    if (!params) params = new URL(context.request.url).searchParams;
    return params;
  };
  return {
    get(name: string): string | null {
      return ensure().get(name);
    },
    getAll(name: string): readonly string[] {
      return ensure().getAll(name);
    },
    has(name: string): boolean {
      return ensure().has(name);
    },
    get size(): number {
      return ensure().size;
    },
  };
}

/** A cookie mutation queued for the eventual response. */
export interface CookieDirective {
  readonly name: string;
  readonly value: string | null;
  readonly options: Readonly<{
    maxAge?: number;
    path?: string;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
    expires?: Date;
  }>;
}

function encodeSetCookie(directive: CookieDirective): string {
  if (directive.value === null) {
    // deletion: empty value + epoch expiry
    const maxAge = directive.options.maxAge ?? 0;
    return `${directive.name}=; Max-Age=${maxAge}; expires=Thu, 01 Jan 1970 00:00:00 GMT${
      directive.options.path ? `; Path=${directive.options.path}` : "; Path=/"
    }`;
  }
  let cookie = `${directive.name}=${encodeURIComponent(directive.value)}`;
  const options = directive.options;
  if (options.maxAge !== undefined) cookie += `; Max-Age=${options.maxAge}`;
  if (options.expires) cookie += `; Expires=${options.expires.toUTCString()}`;
  if (options.path) cookie += `; Path=${options.path}`;
  if (options.domain) cookie += `; Domain=${options.domain}`;
  if (options.secure) cookie += "; Secure";
  if (options.httpOnly) cookie += "; HttpOnly";
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
  return cookie;
}

const COOKIE_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

export class InvalidCookieNameError extends Error {
  public constructor(name: string) {
    super(
      `invalid cookie name ${JSON.stringify(name)}: token characters only; control characters and separators are rejected`,
    );
    this.name = "InvalidCookieNameError";
  }
}

/**
 * Cookie mutation queue. Handlers call `set`/`delete`, then explicitly apply
 * the queue to a response via `withCookies`. Mutations never touch the
 * request's own cookie view.
 */
export class CookieMutations {
  private readonly directives: CookieDirective[] = [];

  public set(
    name: string,
    value: string,
    options: CookieDirective["options"] = {},
  ): this {
    if (!COOKIE_NAME_PATTERN.test(name) || /[\r\n\0]/.test(value)) {
      throw new InvalidCookieNameError(name);
    }
    this.directives.push({ name, value, options });
    return this;
  }

  public delete(name: string, path = "/"): this {
    if (!COOKIE_NAME_PATTERN.test(name)) {
      throw new InvalidCookieNameError(name);
    }
    this.directives.push({
      name,
      value: null,
      options: { path, maxAge: 0 },
    });
    return this;
  }

  /** Queued Set-Cookie serializations, in mutation order. */
  public serialize(): readonly string[] {
    return this.directives.map(encodeSetCookie);
  }

  public get size(): number {
    return this.directives.length;
  }
}

/** The explicit mechanism: applies queued cookie mutations to a response. */
export function withCookies(
  response: Response,
  mutations: CookieMutations,
): Response {
  const headers = new Headers(response.headers);
  for (const cookie of mutations.serialize()) {
    headers.append("set-cookie", cookie);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
