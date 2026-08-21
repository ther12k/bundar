/**
 * Bounded request-body parsing (GH-057).
 *
 * Explicit, lazy body APIs with content-type dispatch, secure default
 * limits (bytes, fields, files, JSON nesting, timeout), single-consumption
 * semantics with deterministic errors, and ordered repeated-key form data
 * distinguishing absent from empty. Parsing runs only when a handler calls
 * an API — never per-route automatically.
 */
import type { Context } from "../context";

export interface BodyLimits {
  readonly maxBytes: number;
  readonly maxFields: number;
  readonly maxFiles: number;
  readonly maxNestingDepth: number;
  readonly timeoutMs: number;
}

/** Secure defaults (documented; callers may tighten, never loosen silently). */
export const DEFAULT_BODY_LIMITS: BodyLimits = Object.freeze({
  maxBytes: 1_048_576, // 1 MiB
  maxFields: 100,
  maxFiles: 10,
  maxNestingDepth: 8,
  timeoutMs: 10_000,
});

export class BodyLimitError extends Error {
  public readonly limit: string;

  public constructor(limit: string, detail: string) {
    super(`body limit exceeded (${limit}): ${detail}`);
    this.name = "BodyLimitError";
    this.limit = limit;
  }
}

export class BodyConsumedError extends Error {
  public constructor(api: string) {
    super(
      `request body already consumed; ${api} cannot read it again (bodies are single-consumption)`,
    );
    this.name = "BodyConsumedError";
  }
}

export class UnsupportedMediaTypeError extends Error {
  public readonly contentType: string;
  public readonly status = 415;

  public constructor(contentType: string) {
    super(
      `unsupported media type ${JSON.stringify(contentType || "(none)")}: ` +
        `supported: application/x-www-form-urlencoded, multipart/form-data, text/plain, application/json`,
    );
    this.name = "UnsupportedMediaTypeError";
    this.contentType = contentType;
  }
}

export class MalformedBodyError extends Error {
  public readonly status = 400;

  public constructor(kind: string, detail: string) {
    super(`malformed ${kind} body: ${detail}`);
    this.name = "MalformedBodyError";
  }
}

/** Ordered form field: key plus every value in submission order. */
export interface FormField {
  readonly name: string;
  readonly values: readonly string[];
}

export interface ParsedForm {
  /** All fields in first-appearance order, values ordered by submission. */
  readonly fields: readonly FormField[];
  /** File parts (multipart only), bounded by maxFiles. */
  readonly files: readonly FormFile[];
  get(name: string): string | null;
  getAll(name: string): readonly string[];
  has(name: string): boolean;
}

export interface FormFile {
  readonly name: string;
  readonly filename: string;
  readonly type: string;
  readonly size: number;
  readonly bytes: Uint8Array;
}

function contentTypeOf(request: Request): string {
  return (request.headers.get("content-type") ?? "")
    .split(";")[0]!
    .trim()
    .toLowerCase();
}

async function readBoundedBytes(
  request: Request,
  limits: BodyLimits,
): Promise<Uint8Array> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > limits.maxBytes) {
    throw new BodyLimitError(
      "maxBytes",
      `Content-Length ${declared} exceeds ${limits.maxBytes}`,
    );
  }

  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array(0);

  const timeout = setTimeout(() => {
    void reader.cancel(
      new BodyLimitError("timeoutMs", `${limits.timeoutMs}ms elapsed`),
    );
  }, limits.timeoutMs);

  try {
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value!.byteLength;
      if (total > limits.maxBytes) {
        void reader.cancel(
          new BodyLimitError(
            "maxBytes",
            `streamed ${total} bytes exceeds ${limits.maxBytes}`,
          ),
        );
        throw new BodyLimitError(
          "maxBytes",
          `streamed ${total} bytes exceeds ${limits.maxBytes}`,
        );
      }
      chunks.push(value!);
    }
    const combined = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return combined;
  } finally {
    clearTimeout(timeout);
  }
}

function buildForm(
  entries: readonly [string, string][],
  files: readonly FormFile[],
): ParsedForm {
  if (entries.length > 0) {
    const seen = new Set<string>();
    const ordered: { name: string; values: string[] }[] = [];
    for (const [name] of entries) {
      if (!seen.has(name)) {
        seen.add(name);
        ordered.push({ name, values: [] });
      }
    }
    for (const [name, value] of entries) {
      ordered.find((f) => f.name === name)!.values.push(value);
    }
    const fields: FormField[] = ordered.map((f) => ({
      name: f.name,
      values: Object.freeze(f.values),
    }));
    return Object.freeze({
      fields: Object.freeze(fields),
      files: Object.freeze(files),
      get: (name: string) =>
        entries.filter(([n]) => n === name)[0]?.[1] ?? null,
      getAll: (name: string) =>
        Object.freeze(entries.filter(([n]) => n === name).map(([, v]) => v)),
      has: (name: string) => entries.some(([n]) => n === name),
    }) as ParsedForm;
  }
  return Object.freeze({
    fields: Object.freeze([]),
    files: Object.freeze(files),
    get: () => null,
    getAll: () => Object.freeze([]),
    has: () => false,
  }) as ParsedForm;
}

/** Parses the request body as a form (urlencoded or multipart). */
export async function parseForm(
  context: Context,
  limits: Partial<BodyLimits> = {},
): Promise<ParsedForm> {
  const effective: BodyLimits = { ...DEFAULT_BODY_LIMITS, ...limits };
  const request = context.request;
  if (request.bodyUsed) throw new BodyConsumedError("parseForm");

  const type = contentTypeOf(request);
  if (
    type !== "application/x-www-form-urlencoded" &&
    type !== "multipart/form-data"
  ) {
    throw new UnsupportedMediaTypeError(
      request.headers.get("content-type") ?? "",
    );
  }

  const bytes = await readBoundedBytes(request, effective);
  const text = new TextDecoder().decode(bytes);

  if (type === "application/x-www-form-urlencoded") {
    const params = new URLSearchParams(text);
    if (params.size > effective.maxFields) {
      throw new BodyLimitError(
        "maxFields",
        `${params.size} fields exceeds ${effective.maxFields}`,
      );
    }
    const entries: [string, string][] = [];
    for (const [name, value] of params.entries()) {
      // URLSearchParams iterates repeated keys per value: order preserved
      entries.push([name, value]);
    }
    return buildForm(entries, []);
  }

  // multipart/form-data via the FormData constructor on a rebuilt request
  const boundaryRequest = new Request("http://bundar.invalid/", {
    method: "POST",
    headers: { "content-type": request.headers.get("content-type")! },
    body: bytes,
  });
  const formData = await boundaryRequest.formData();
  const entries: [string, string][] = [];
  const files: FormFile[] = [];
  let fieldCount = 0;
  for (const [name, value] of formData.entries()) {
    if (typeof value === "string") {
      fieldCount++;
      if (fieldCount > effective.maxFields) {
        throw new BodyLimitError(
          "maxFields",
          `${fieldCount} fields exceeds ${effective.maxFields}`,
        );
      }
      entries.push([name, value]);
    } else {
      if (files.length + 1 > effective.maxFiles) {
        throw new BodyLimitError(
          "maxFiles",
          `${files.length + 1} files exceeds ${effective.maxFiles}`,
        );
      }
      const buffer = await value.arrayBuffer();
      if (buffer.byteLength > effective.maxBytes) {
        throw new BodyLimitError(
          "maxBytes",
          `file ${value.name} exceeds ${effective.maxBytes}`,
        );
      }
      files.push(
        Object.freeze({
          name,
          filename: value.name,
          type: value.type,
          size: buffer.byteLength,
          bytes: new Uint8Array(buffer),
        }),
      );
    }
  }
  return buildForm(entries, files);
}

/** Parses the body as JSON with a nesting-depth guard. */
export async function parseJson<T = unknown>(
  context: Context,
  limits: Partial<BodyLimits> = {},
): Promise<T> {
  const effective: BodyLimits = { ...DEFAULT_BODY_LIMITS, ...limits };
  const request = context.request;
  if (request.bodyUsed) throw new BodyConsumedError("parseJson");

  const type = contentTypeOf(request);
  if (type !== "application/json") {
    throw new UnsupportedMediaTypeError(
      request.headers.get("content-type") ?? "",
    );
  }

  const bytes = await readBoundedBytes(request, effective);
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch (cause) {
    throw new MalformedBodyError(
      "JSON",
      cause instanceof Error ? cause.message : String(cause),
    );
  }

  const depth = measureDepth(parsed, 0, effective.maxNestingDepth);
  void depth;
  return parsed as T;
}

function measureDepth(value: unknown, depth: number, max: number): number {
  if (depth > max) {
    throw new BodyLimitError("maxNestingDepth", `${max} levels exceeded`);
  }
  if (Array.isArray(value)) {
    let deepest = depth;
    for (const entry of value) {
      deepest = Math.max(deepest, measureDepth(entry, depth + 1, max));
    }
    return deepest;
  }
  if (typeof value === "object" && value !== null) {
    let deepest = depth;
    for (const entry of Object.values(value)) {
      deepest = Math.max(deepest, measureDepth(entry, depth + 1, max));
    }
    return deepest;
  }
  return depth;
}

/** Reads the body as plain text (bounded). */
export async function parseText(
  context: Context,
  limits: Partial<BodyLimits> = {},
): Promise<string> {
  const effective: BodyLimits = { ...DEFAULT_BODY_LIMITS, ...limits };
  const request = context.request;
  if (request.bodyUsed) throw new BodyConsumedError("parseText");

  const type = contentTypeOf(request);
  if (type !== "text/plain" && type !== "") {
    throw new UnsupportedMediaTypeError(
      request.headers.get("content-type") ?? "",
    );
  }
  const bytes = await readBoundedBytes(request, effective);
  return new TextDecoder().decode(bytes);
}
