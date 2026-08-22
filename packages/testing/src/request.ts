/**
 * Request builders for tests (GH-074): standards-based `Request` objects
 * for forms, JSON, multipart fixtures, and enhanced (HTMX) submissions.
 * Protocol header strings come from @bundar/htmx's neutral helpers — this
 * package never hand-writes them.
 */
import { buildHtmxRequestHeaders } from "@bundar/htmx";
import type {
  HtmxDialectAdapter,
  HtmxRequestHeaderOptions,
} from "@bundar/htmx";

export const TEST_ORIGIN = "http://bundar.test";

export type RequestInitLike = Omit<RequestInit, "body"> & {
  readonly body?: string | FormData;
};

/** Multipart part value: plain field, blob, or named file fixture. */
export type MultipartPart =
  | string
  | Blob
  | {
      readonly content: string | Uint8Array;
      readonly filename: string;
      readonly type?: string;
    };

function toBlob(part: MultipartPart): Blob | string {
  if (typeof part === "string" || part instanceof Blob) return part;
  const bytes =
    typeof part.content === "string"
      ? new TextEncoder().encode(part.content)
      : part.content;
  return new Blob([bytes as Uint8Array], {
    ...(part.type !== undefined ? { type: part.type } : {}),
  });
}

/** Builds an `application/x-www-form-urlencoded` POST Request. */
export function formRequest(
  path: string,
  fields: Record<string, string>,
  init: RequestInitLike = {},
): Request {
  return new Request(`${TEST_ORIGIN}${path}`, {
    ...init,
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      // browsers always send Origin on form submissions; CSRF origin
      // checks fail closed without it (overridable via init.headers)
      origin: TEST_ORIGIN,
      ...(init.headers as Record<string, string> | undefined),
    },
    body: new URLSearchParams(fields).toString(),
  });
}

/** Builds a JSON Request with any method (default POST). */
export function jsonRequest(
  path: string,
  value: unknown,
  init: RequestInitLike = {},
): Request {
  return new Request(`${TEST_ORIGIN}${path}`, {
    ...init,
    method: init.method ?? "POST",
    headers: {
      "content-type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
    body: JSON.stringify(value),
  });
}

/**
 * Builds a multipart Request from field/file parts. Object parts become
 * file fixtures with the given filename; `type` sets the part's MIME type.
 */
export function multipartRequest(
  path: string,
  parts: Record<string, MultipartPart>,
  init: RequestInitLike = {},
): Request {
  const form = new FormData();
  for (const [name, part] of Object.entries(parts)) {
    const value = toBlob(part);
    if (typeof value === "string") {
      form.append(name, value);
    } else if (
      typeof part === "object" &&
      !(part instanceof Blob) &&
      "filename" in part
    ) {
      form.append(name, value, part.filename);
    } else {
      form.append(name, value, "blob");
    }
  }
  return new Request(`${TEST_ORIGIN}${path}`, {
    ...init,
    method: init.method ?? "POST",
    body: form,
  });
}

/** A binary file fixture (default MIME `application/octet-stream`). */
export function fileFixture(
  content: string | Uint8Array,
  filename: string,
  type = "application/octet-stream",
): MultipartPart {
  return { content, filename, type };
}

export interface EnhancedRequestOptions extends RequestInitLike {
  /** Dialect-correct header names (htmx 4 beta aliases the trigger). */
  readonly dialect?: HtmxDialectAdapter;
  /** Browser-side metadata a real enhanced request would carry. */
  readonly htmx?: HtmxRequestHeaderOptions;
}

/**
 * Builds an enhanced (HTMX) request: applies the dialect-correct header
 * set from @bundar/htmx on top of any explicit init. Omit `htmx` for an
 * ordinary no-JS request.
 */
export function enhancedRequest(
  path: string,
  options: EnhancedRequestOptions = {},
): Request {
  const { htmx, dialect, ...init } = options;
  const headers = {
    ...(init.headers as Record<string, string> | undefined),
    ...(htmx !== undefined ? buildHtmxRequestHeaders(htmx, dialect) : {}),
  };
  return new Request(`${TEST_ORIGIN}${path}`, {
    ...init,
    method: init.method ?? "GET",
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
    ...(init.body !== undefined ? { body: init.body } : {}),
  });
}
