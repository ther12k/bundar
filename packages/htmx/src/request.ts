/**
 * Normalized HTMX request metadata (GH-041).
 *
 * Decodes any request into one version-neutral record. Consumers never see
 * v2 `HX-Trigger` vs v4 `HX-Source` differences; dialect adapters map their
 * headers onto these fields. Raw client values are untrusted: URLs and
 * selectors are surfaced as data, never as authorization or trusted
 * redirect destinations. Raw headers remain reachable only behind an
 * explicit diagnostic accessor.
 */

/** What kind of htmx interaction produced the request. */
export type HtmxRequestKind = "standard" | "boosted" | "history-restore";

/**
 * Trusted status of browser-supplied metadata. Only "untrusted" exists:
 * every client-provided URL/selector/id is untrusted by construction, and
 * the field forces consumers to acknowledge it.
 */
export type HtmxTrustLevel = "untrusted";

/** How a metadata field was resolved. */
export type HtmxFieldStatus =
  "present" | "absent" | "malformed" | "unsupported";

export interface NormalizedHtmxField<T> {
  readonly status: HtmxFieldStatus;
  readonly value: T | null;
  readonly trust: HtmxTrustLevel;
}

export interface NormalizedHtmxRequest {
  readonly kind: HtmxRequestKind;
  readonly isHtmx: boolean;
  readonly sourceElement: NormalizedHtmxField<string>;
  readonly target: NormalizedHtmxField<string>;
  readonly currentUrl: NormalizedHtmxField<URL>;
  readonly boosted: boolean;
  readonly prompt: NormalizedHtmxField<string>;
  readonly historyRestore: boolean;
  /** Full-page vs fragment representation intent (GH-048 owns negotiation). */
  readonly representation: "page" | "fragment";
  readonly raw: RawHeadersDiagnostic;
}

/** Explicit escape hatch for diagnostics only — never for logic. */
export interface RawHeadersDiagnostic {
  (): Readonly<Record<string, string>>;
  readonly __diagnosticOnly: true;
}

export class MalformedHtmxHeaderError extends Error {
  public readonly header: string;

  public constructor(header: string, detail: string) {
    super(`malformed HTMX header ${JSON.stringify(header)}: ${detail}`);
    this.name = "MalformedHtmxHeaderError";
    this.header = header;
  }
}

const SELECTOR_PATTERN = /^[A-Za-z0-9_[\]().#:-]{1,128}$/;
const HEADER_INJECTION = /[\r\n\0]/;

type HeaderReader = (header: string) => string | null;

function stringField(
  read: HeaderReader,
  header: string,
  validate?: (value: string) => boolean,
): NormalizedHtmxField<string> {
  const raw = read(header);
  if (raw === null) {
    return { status: "absent", value: null, trust: "untrusted" };
  }
  if (HEADER_INJECTION.test(raw)) {
    throw new MalformedHtmxHeaderError(header, "control characters rejected");
  }
  if (validate && !validate(raw)) {
    return { status: "malformed", value: null, trust: "untrusted" };
  }
  return { status: "present", value: raw, trust: "untrusted" };
}

function urlField(
  read: HeaderReader,
  header: string,
): NormalizedHtmxField<URL> {
  const raw = read(header);
  if (raw === null) {
    return { status: "absent", value: null, trust: "untrusted" };
  }
  if (HEADER_INJECTION.test(raw)) {
    throw new MalformedHtmxHeaderError(header, "control characters rejected");
  }
  try {
    const url = new URL(raw);
    return { status: "present", value: url, trust: "untrusted" };
  } catch {
    return { status: "malformed", value: null, trust: "untrusted" };
  }
}

/**
 * Decodes a request into normalized metadata. Version differences are the
 * caller's concern only insofar as they pass a header-alias map; this
 * function is case-insensitive via the Headers API and deterministic in
 * output shape.
 */
export function normalizeHtmxRequest(
  request: Request,
  options: { headerAliases?: Readonly<Record<string, string>> } = {},
): NormalizedHtmxRequest {
  const aliases = options.headerAliases ?? {};
  const read: HeaderReader = (canonical: string): string | null =>
    request.headers.get(aliases[canonical] ?? canonical);

  const isHtmx = read("HX-Request") === "true";
  const boosted = read("HX-Boosted") === "true";
  const historyRestore = read("HX-History-Restore-Request") === "true";

  const sourceRaw = read("HX-Trigger");
  let source: NormalizedHtmxField<string>;
  if (sourceRaw === null) {
    source = { status: "absent", value: null, trust: "untrusted" };
  } else if (HEADER_INJECTION.test(sourceRaw)) {
    throw new MalformedHtmxHeaderError(
      "HX-Trigger",
      "control characters rejected",
    );
  } else {
    source = { status: "present", value: sourceRaw, trust: "untrusted" };
  }

  const target = stringField(read, "HX-Target", (value) =>
    SELECTOR_PATTERN.test(value),
  );
  const prompt = stringField(read, "HX-Prompt");
  const currentUrl = urlField(read, "HX-Current-URL");

  const kind: HtmxRequestKind = historyRestore
    ? "history-restore"
    : boosted
      ? "boosted"
      : "standard";

  const rawSnapshot = (() => {
    const snapshot: Record<string, string> = {};
    for (const [key, value] of request.headers.entries()) {
      if (key.toLowerCase().startsWith("hx-")) snapshot[key] = value;
    }
    return Object.freeze(snapshot);
  })();

  const rawDiagnostic = () => rawSnapshot;
  Object.defineProperty(rawDiagnostic, "__diagnosticOnly", {
    value: true as const,
    enumerable: false,
  });

  return {
    kind,
    isHtmx,
    sourceElement: source,
    target,
    currentUrl,
    boosted,
    prompt,
    historyRestore,
    representation: isHtmx || boosted ? "fragment" : "page",
    raw: rawDiagnostic as RawHeadersDiagnostic,
  };
}
