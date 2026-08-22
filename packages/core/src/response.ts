/**
 * Explicit response helpers (GH-021).
 *
 * Every helper returns a native `Response`. There is no implicit
 * conversion of arbitrary handler return values — handlers construct
 * responses explicitly. Header merges are safe (append semantics for
 * Set-Cookie and Vary; set semantics elsewhere).
 */

export interface ResponseInit2 {
  readonly status?: number;
  readonly headers?: Headers | Record<string, string>;
}

function mergeHeaders(
  base: Record<string, string> | undefined,
  extra: Record<string, string> | undefined,
): Headers {
  const headers = new Headers(base);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      headers.set(key, value);
    }
  }
  return headers;
}

/** Plain-text response. */
export function text(
  body: string,
  options: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(body, {
    status: options.status ?? 200,
    headers: mergeHeaders(
      { "content-type": "text/plain; charset=utf-8" },
      options.headers,
    ),
  });
}

/** JSON response with deterministic serialization (sorted keys). */
export function json(
  body: unknown,
  options: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: options.status ?? 200,
    headers: mergeHeaders(
      { "content-type": "application/json; charset=utf-8" },
      options.headers,
    ),
  });
}

/** HTML-string response (strings only — JSX integration is GH-033). */
export function html(
  body: string,
  options: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(body, {
    status: options.status ?? 200,
    headers: mergeHeaders(
      { "content-type": "text/html; charset=utf-8" },
      options.headers,
    ),
  });
}

/**
 * Redirect. Defaults: 302 for GET-compatible navigation, 303 after
 * form-processing actions (documented semantics; override with `status`).
 * 301/308 preserve the method; 302/303/307 do not (303 forces GET).
 */
export function redirect(
  location: string,
  options: { status?: 301 | 302 | 303 | 307 | 308 } = {},
): Response {
  return new Response(null, {
    status: options.status ?? 302,
    headers: { location },
  });
}

/** Redirect suited to post-form-processing navigation. */
export function seeOther(location: string): Response {
  return redirect(location, { status: 303 });
}

/** Empty response (204 default; 200 with empty body when required). */
export function empty(options: { status?: number } = {}): Response {
  const status = options.status ?? 204;
  if (status === 204 || status === 304) {
    return new Response(null, { status });
  }
  return new Response(null, { status });
}

/** File/delegation response: streams a Bun file with a content type. */
export function file(
  path: string,
  options: {
    type?: string;
    status?: number;
    headers?: Record<string, string>;
  } = {},
): Response {
  const bunFile = Bun.file(path);
  return new Response(bunFile, {
    status: options.status ?? 200,
    headers: mergeHeaders(
      options.type ? { "content-type": options.type } : undefined,
      options.headers,
    ),
  });
}

/**
 * Appends headers to an existing response without collapsing multi-values.
 * Set-Cookie and Vary use append semantics; other keys overwrite.
 */
export function withHeaders(
  response: Response,
  headers: Record<string, string | readonly string[]>,
): Response {
  const merged = new Headers(response.headers);
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    const multi = lower === "set-cookie" || lower === "vary";
    if (multi && Array.isArray(value)) {
      for (const entry of value) merged.append(key, entry);
    } else if (multi) {
      merged.append(key, String(value));
    } else if (Array.isArray(value)) {
      merged.set(key, value.join(", "));
    } else {
      merged.set(key, String(value));
    }
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: merged,
  });
}
