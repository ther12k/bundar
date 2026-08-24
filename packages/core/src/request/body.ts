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
  /** BR-066: total multipart parts (fields + files). */
  readonly maxParts: number;
  /** BR-066: single text-field byte budget. */
  readonly maxFieldBytes: number;
  /** BR-066: single file byte budget. */
  readonly maxFileBytes: number;
  /** BR-066: header-block bytes allowed per multipart part. */
  readonly maxPartHeaderBytes: number;
  /** BR-066: repeated occurrences allowed per field name. */
  readonly maxDuplicateKeys: number;
  readonly timeoutMs: number;
}

/** Secure defaults (documented; callers may tighten, never loosen silently). */
export const DEFAULT_BODY_LIMITS: BodyLimits = Object.freeze({
  maxBytes: 1_048_576, // 1 MiB
  maxFields: 100,
  maxFiles: 10,
  maxNestingDepth: 8,
  maxParts: 200,
  maxFieldBytes: 65_536,
  maxFileBytes: 10 * 1_048_576,
  maxPartHeaderBytes: 8 * 1024,
  maxDuplicateKeys: 16,
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

/** Shared, stateless decoder for whole-buffer decodes (no stream mode). */
const FORM_TEXT_DECODER = new TextDecoder();

async function readBoundedBytes(
  request: Request,
  limits: BodyLimits,
  signal?: AbortSignal,
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

  // Slowloris guard: cancel() makes pending reads resolve done, so a flag
  // (not the cancel reason) carries the timeout into a hard failure — a
  // dribbling body can never be accepted as a complete partial read.
  let timedOut = false;
  let completedNormally: boolean | undefined;
  const timeout = setTimeout(() => {
    timedOut = true;
    void reader.cancel();
  }, limits.timeoutMs);

  // BR-066: client disconnect / budget abort must terminate bounded reads
  // promptly instead of waiting for the slowloris timer.
  let abortedDuringRead = false;
  const abortGate = new Promise<never>((_, reject) => {
    if (signal === undefined) return;
    const onAbort = (): void => {
      abortedDuringRead = true; // wins the race even if cancel resolves done
      void reader.cancel();
      reject(
        new BodyLimitError(
          "timeoutMs",
          "request aborted before the body completed",
        ),
      );
    };
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
  });

  try {
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), abortGate]);
      if (done) {
        completedNormally = true;
        break;
      }
      total += value!.byteLength;
      if (total > limits.maxBytes) {
        void reader.cancel();
        throw new BodyLimitError(
          "maxBytes",
          `streamed ${total} bytes exceeds ${limits.maxBytes}`,
        );
      }
      chunks.push(value!);
    }
    if (timedOut) {
      throw new BodyLimitError(
        "timeoutMs",
        `${limits.timeoutMs}ms elapsed with an incomplete body`,
      );
    }
    // Abort-cancelled readers surface as `done` with a TRUNCATED body —
    // that partial payload must never parse as a complete form (BR-066).
    if (abortedDuringRead || (!completedNormally && signal?.aborted === true)) {
      throw new BodyLimitError(
        "timeoutMs",
        "request aborted mid-body; truncated payload discarded",
      );
    }
    // small bodies (the common form post) arrive as one chunk — return
    // it directly instead of copying into a combined buffer
    if (chunks.length === 1) return chunks[0]!;
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
  const effective: BodyLimits =
    limits === undefined || Object.keys(limits).length === 0
      ? DEFAULT_BODY_LIMITS
      : { ...DEFAULT_BODY_LIMITS, ...limits };
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

  const bytes = await readBoundedBytes(request, effective, context.signal);
  // stateless decode: one shared decoder, no per-call allocation
  const text = FORM_TEXT_DECODER.decode(bytes);

  if (type === "application/x-www-form-urlencoded") {
    const params = new URLSearchParams(text);
    if (params.size > effective.maxFields) {
      throw new BodyLimitError(
        "maxFields",
        `${params.size} fields exceeds ${effective.maxFields}`,
      );
    }
    // single pass: field order = first appearance, values keep submission
    // order — identical semantics to buildForm without the second scan
    const byName = new Map<string, string[]>();
    const order: string[] = [];
    let partsSeen = 0;
    for (const [name, value] of params.entries()) {
      partsSeen += 1;
      if (partsSeen > effective.maxParts) {
        throw new BodyLimitError(
          "maxParts",
          `${partsSeen} parts exceeds ${effective.maxParts}`,
        );
      }
      const valueBytes = Buffer.byteLength(value);
      if (valueBytes > effective.maxFieldBytes) {
        throw new BodyLimitError(
          "maxFieldBytes",
          `field value of ${valueBytes} bytes exceeds ${effective.maxFieldBytes}`,
        );
      }
      let values = byName.get(name);
      if (values === undefined) {
        values = [];
        byName.set(name, values);
        order.push(name);
      }
      if (values.length + 1 > effective.maxDuplicateKeys) {
        throw new BodyLimitError(
          "maxDuplicateKeys",
          `field "${name}" repeated more than ${effective.maxDuplicateKeys} times`,
        );
      }
      values.push(value);
    }
    const fields: FormField[] = order.map((name) => ({
      name,
      values: Object.freeze(byName.get(name)!),
    }));
    return Object.freeze({
      fields: Object.freeze(fields),
      files: Object.freeze([]),
      get: (name: string) => byName.get(name)?.[0] ?? null,
      getAll: (name: string) => Object.freeze([...(byName.get(name) ?? [])]),
      has: (name: string) => byName.has(name),
    }) as ParsedForm;
  }

  // multipart/form-data via the FormData constructor on a rebuilt request
  // BR-066: multipart header-block scan BEFORE native parsing — Bun's
  // parser does not expose per-part header sizes, so a hostile part with
  // megabytes of headers must be rejected here. Malformed terminator
  // (missing final boundary) also surfaces as MalformedBodyError.
  enforceMultipartHeaderBudget(
    bytes,
    request.headers.get("content-type")!,
    effective.maxPartHeaderBytes,
  );

  const boundaryRequest = new Request("http://bundar.invalid/", {
    method: "POST",
    headers: { "content-type": request.headers.get("content-type")! },
    body: bytes,
  });
  let formData: globalThis.FormData;
  try {
    formData =
      (await boundaryRequest.formData()) as unknown as globalThis.FormData;
  } catch (cause) {
    // Native parse failures include malformed terminators / truncated
    // bodies — normalize so callers see one documented error family.
    throw new MalformedBodyError(
      "multipart",
      cause instanceof Error ? cause.message : String(cause),
    );
  }
  const entries: [string, string][] = [];
  const files: FormFile[] = [];
  let partsSeen = 0;
  for (const [name, value] of formData.entries() as IterableIterator<
    [string, string | File]
  >) {
    partsSeen += 1;
    if (partsSeen > effective.maxParts) {
      throw new BodyLimitError(
        "maxParts",
        `${partsSeen} parts exceeds ${effective.maxParts}`,
      );
    }
    if (typeof value === "string") {
      if (entries.length + 1 > effective.maxFields) {
        throw new BodyLimitError(
          "maxFields",
          `${entries.length + 1} fields exceeds ${effective.maxFields}`,
        );
      }
      const valueBytes = Buffer.byteLength(value);
      if (valueBytes > effective.maxFieldBytes) {
        throw new BodyLimitError(
          "maxFieldBytes",
          `text part of ${valueBytes} bytes exceeds ${effective.maxFieldBytes}`,
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
    }
    if (typeof value !== "string") {
      // File branch (kept separate so the field path above stays sync).
      const file = value as File;
      const buffer = await file.arrayBuffer();
      if (buffer.byteLength > effective.maxFileBytes) {
        throw new BodyLimitError(
          "maxFileBytes",
          `file part ${files.length + 1} of ${buffer.byteLength} bytes exceeds ${effective.maxFileBytes}`,
        );
      }
      files.push(
        Object.freeze({
          name,
          filename: file.name,
          type: file.type,
          size: buffer.byteLength,
          bytes: new Uint8Array(buffer),
        }),
      );
    }
  }

  // Duplicate-key budget across the merged view.
  const dupes = new Map<string, number>();
  for (const [name] of entries) {
    dupes.set(name, (dupes.get(name) ?? 0) + 1);
  }
  for (const [, count] of dupes) {
    if (count > effective.maxDuplicateKeys) {
      throw new BodyLimitError(
        "maxDuplicateKeys",
        `field repeated ${count} times exceeds ${effective.maxDuplicateKeys}`,
      );
    }
  }
  return buildForm(entries, files);
}

/** Measures each part's header block against the per-part budget. */
function enforceMultipartHeaderBudget(
  bytes: Uint8Array,
  contentType: string,
  maxHeaderBytes: number,
): void {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i);
  if (boundaryMatch === null) return; // content-type validation happens elsewhere
  const delimiter = `--${boundaryMatch[1] ?? boundaryMatch[2]!}`;
  const delimiterBytes = new TextEncoder().encode(delimiter);

  let index = indexOfSequence(bytes, delimiterBytes, 0);
  while (index !== -1) {
    let cursor = index + delimiterBytes.length;
    // terminal "--" → done
    if (bytes[cursor] === 0x2d && bytes[cursor + 1] === 0x2d) return;
    // skip CRLF after boundary line
    while (
      cursor < bytes.length &&
      (bytes[cursor] === 0x0d || bytes[cursor] === 0x0a)
    )
      cursor += 1;
    const headStart = cursor;
    const headEnd = indexOfSequence(
      bytes,
      new TextEncoder().encode("\r\n\r\n"),
      headStart,
    );
    if (headEnd === -1) return; // truncated final part: native parser reports it
    const headerBytes = headEnd - headStart;
    if (headerBytes > maxHeaderBytes) {
      throw new BodyLimitError(
        "maxPartHeaderBytes",
        `part header block of ${headerBytes} bytes exceeds ${maxHeaderBytes}`,
      );
    }
    index = indexOfSequence(bytes, delimiterBytes, headEnd);
  }
}

function indexOfSequence(
  haystack: Uint8Array,
  needle: Uint8Array,
  from: number,
): number {
  outer: for (let i = from; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

/** Parses the body as JSON with a nesting-depth guard. */
export async function parseJson<T = unknown>(
  context: Context,
  limits: Partial<BodyLimits> = {},
): Promise<T> {
  const effective: BodyLimits =
    limits === undefined || Object.keys(limits).length === 0
      ? DEFAULT_BODY_LIMITS
      : { ...DEFAULT_BODY_LIMITS, ...limits };
  const request = context.request;
  if (request.bodyUsed) throw new BodyConsumedError("parseJson");

  const type = contentTypeOf(request);
  if (type !== "application/json") {
    throw new UnsupportedMediaTypeError(
      request.headers.get("content-type") ?? "",
    );
  }

  const bytes = await readBoundedBytes(request, effective, context.signal);
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
  const effective: BodyLimits =
    limits === undefined || Object.keys(limits).length === 0
      ? DEFAULT_BODY_LIMITS
      : { ...DEFAULT_BODY_LIMITS, ...limits };
  const request = context.request;
  if (request.bodyUsed) throw new BodyConsumedError("parseText");

  const type = contentTypeOf(request);
  if (type !== "text/plain" && type !== "") {
    throw new UnsupportedMediaTypeError(
      request.headers.get("content-type") ?? "",
    );
  }
  const bytes = await readBoundedBytes(request, effective, context.signal);
  return new TextDecoder().decode(bytes);
}
