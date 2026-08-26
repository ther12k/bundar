/**
 * In-process route matching over a compiled route table (GH-074 / BR-092).
 *
 * `Bun.serve` owns route matching in production; the in-process client
 * re-implements the supported subset of Bun's route syntax — exact paths,
 * `:param` segments, and `*` wildcard tails — with identical category
 * precedence (exact > parameter > wildcard > catch-all) and deterministic Allow
 * computation.
 */
export type RouteTableEntry = Response | ((request: Request) => unknown);

export interface CompiledTableLike {
  /**
   * The compiled route table in Bun's entry shape: a method map, or a
   * whole-path static `Response` (narrowed at runtime — BunRouteEntry is
   * wider than what compileRoutes emits).
   */
  readonly routes: Readonly<Record<string, unknown>>;
}

export type MatchResult =
  | {
      readonly kind: "matched";
      readonly entry: RouteTableEntry;
      readonly params: Readonly<Record<string, string>>;
      /** Set for framework-generated auto-OPTIONS responses (BR-073 review). */
      readonly optionsResponse?: string;
    }
  | { readonly kind: "method-not-allowed"; readonly allowed: readonly string[] }
  | { readonly kind: "not-found" };

interface CompiledPattern {
  readonly regex: RegExp;
  readonly names: readonly string[];
}

const PARAM_PATTERN = /^:([A-Za-z0-9_]+)$/;

const patternCache = new Map<string, CompiledPattern>();

function compilePattern(path: string): CompiledPattern {
  const cached = patternCache.get(path);
  if (cached !== undefined) return cached;

  const names: string[] = [];
  const segments = path.split("/").map((segment) => {
    if (segment === "*") {
      names.push("*");
      return "(.*)";
    }
    const param = PARAM_PATTERN.exec(segment);
    if (param !== null) {
      names.push(param[1]!);
      return "([^/]+)";
    }
    return segment.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  });
  const compiled: CompiledPattern = {
    regex: new RegExp(`^${segments.join("/")}/?$`),
    names,
  };
  patternCache.set(path, compiled);
  return compiled;
}

function patternPrecedence(pattern: string): {
  rank: number;
  statics: number;
  length: number;
} {
  const parts = pattern.split("/").filter((seg) => seg !== "");
  const statics = parts.filter(
    (seg) => !seg.startsWith(":") && !seg.startsWith("*"),
  ).length;
  let rank = 0;
  if (!parts.some((p) => p.startsWith(":") || p.startsWith("*"))) {
    rank = 0; // exact static
  } else if (
    parts.some((p) => p.startsWith(":")) &&
    !parts.some((p) => p.startsWith("*"))
  ) {
    rank = 1; // parameter
  } else if (parts.some((p) => p.startsWith("*"))) {
    rank = parts.length === 1 ? 3 : 2; // wildcard vs catch-all
  }
  return { rank, statics, length: parts.length };
}

/**
 * Matches a method/path against the compiled table using native Bun
 * precedence (exact > parameter > wildcard > catch-all).
 */
export function matchRoute(
  table: CompiledTableLike,
  method: string,
  pathname: string,
): MatchResult {
  // Sort candidate patterns by category precedence
  const sortedEntries = Object.entries(table.routes).sort(
    ([patternA], [patternB]) => {
      const a = patternPrecedence(patternA);
      const b = patternPrecedence(patternB);
      if (a.rank !== b.rank) return a.rank - b.rank;
      if (a.statics !== b.statics) return b.statics - a.statics;
      return b.length - a.length;
    },
  );

  for (const [pattern, entryShape] of sortedEntries) {
    const compiled = compilePattern(pattern);
    const match = compiled.regex.exec(pathname);
    if (match === null) continue;

    if (entryShape instanceof Response) {
      if (method === "GET" || method === "HEAD") {
        return { kind: "matched", entry: entryShape, params: {} };
      }
      if (method === "OPTIONS") {
        const allow = "GET, HEAD, OPTIONS";
        return {
          kind: "matched",
          entry: (() =>
            new Response(null, { status: 204, headers: { allow } })) as never,
          params: {},
          optionsResponse: allow,
        };
      }
      return {
        kind: "method-not-allowed",
        allowed: ["GET", "HEAD", "OPTIONS"],
      };
    }

    const methods = entryShape as Record<string, RouteTableEntry>;
    const allowed = new Set<string>();
    for (const known of Object.keys(methods)) allowed.add(known.toUpperCase());
    if (methods["GET"] !== undefined) allowed.add("HEAD");
    allowed.add("OPTIONS");

    const isOptions = method === "OPTIONS";
    const entry =
      methods[method] ??
      (method === "HEAD" && methods["GET"] !== undefined
        ? methods["GET"]
        : undefined) ??
      methods["*"];

    if (isOptions && methods["OPTIONS"] === undefined && entry === undefined) {
      const allow = [...allowed].sort().join(", ");
      return {
        kind: "matched",
        entry: (() =>
          new Response(null, { status: 204, headers: { allow } })) as never,
        params: {},
        optionsResponse: allow,
      };
    }

    if (entry !== undefined) {
      const params: Record<string, string> = {};
      compiled.names.forEach((name, index) => {
        if (name === "*") return;
        const rawSegment = match[index + 1] ?? "";
        try {
          params[name] = decodeURIComponent(rawSegment);
        } catch {
          // Bun documents invalid Unicode replacement () on malformed percent sequences
          params[name] = "\uFFFD";
        }
      });
      return { kind: "matched", entry, params };
    }

    // The winning route group matched structurally, but does not implement this method
    const sortedAllow = [...allowed].sort((a, b) => a.localeCompare(b));
    return { kind: "method-not-allowed", allowed: sortedAllow };
  }

  return { kind: "not-found" };
}

/** Attaches matched params the way Bun.serve injects them. */
export function requestWithParams(
  request: Request,
  params: Readonly<Record<string, string>>,
): Request {
  const withParams = request as Request & {
    params?: Readonly<Record<string, string>>;
  };
  withParams.params = params;
  return withParams;
}
