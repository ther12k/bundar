/**
 * In-process route matching over a compiled route table (GH-074).
 *
 * `Bun.serve` owns route matching in production; the in-process client
 * re-implements the supported subset of Bun's route syntax — exact paths,
 * `:param` segments, and `*` wildcard tails — so the same compiled table
 * serves tests without a socket. Method mismatches mirror Bun's 405.
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

/**
 * Matches a method/path against the compiled table. Static `Response`
 * entries and handler functions both surface as `entry`; the caller
 * distinguishes with `instanceof Response`.
 */
export function matchRoute(
  table: CompiledTableLike,
  method: string,
  pathname: string,
): MatchResult {
  const allowed = new Set<string>();
  let sawPath = false;
  for (const [pattern, entryShape] of Object.entries(table.routes)) {
    const compiled = compilePattern(pattern);
    const match = compiled.regex.exec(pathname);
    if (match === null) continue;
    sawPath = true;
    if (entryShape instanceof Response) {
      return { kind: "matched", entry: entryShape, params: {} };
    }
    const methods = entryShape as Record<string, RouteTableEntry>;
    const entry = methods[method] ?? methods["*"];
    for (const known of Object.keys(methods)) allowed.add(known.toUpperCase());
    if (entry !== undefined) {
      const params: Record<string, string> = {};
      compiled.names.forEach((name, index) => {
        if (name === "*") return;
        params[name] = decodeURIComponent(match[index + 1] ?? "");
      });
      return { kind: "matched", entry, params };
    }
  }
  return sawPath
    ? { kind: "method-not-allowed", allowed: [...allowed] }
    : { kind: "not-found" };
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
