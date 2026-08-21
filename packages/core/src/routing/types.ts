/**
 * Typed route model for @bundar/core (GH-012).
 *
 * This module defines the descriptor surface that GH-013–GH-015 compile into
 * native `Bun.serve({ routes })` tables. It intentionally contains no routing
 * runtime: no dispatch, no path matching, and no body parsing. The only
 * runtime values here are the method definition and its guard, which exist so
 * that later stages and callers share one source of truth.
 */

/**
 * Methods natively representable in `Bun.serve` route tables. CONNECT and
 * TRACE are intentionally absent: Bun routes cannot express them, and Bundar
 * does not invent transport-level behavior.
 */
export const HTTP_METHODS = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export function isHttpMethod(value: string): value is HttpMethod {
  return (HTTP_METHODS as readonly string[]).includes(value);
}

/** Flattens intersections produced by recursive path analysis. */
export type Simplify<T> = { [K in keyof T]: T[K] };

type ParamScan<Remainder extends string> =
  Remainder extends `${string}:${infer Name}/${infer Rest}`
    ? { [K in Name & string]: string } & ParamScan<Rest>
    : Remainder extends `${string}:${infer Name}`
      ? { [K in Name & string]: string }
      : Record<never, never>;

/**
 * Literal `:param` segments of a route path as a flat `{ name: string }`
 * record. Parameters are always strings; parsing to other types is
 * application work. A trailing `*` wildcard contributes no named parameters —
 * wildcard dispatch is owned by GH-015 against `Bun.serve`'s actual behavior.
 */
export type RouteParams<Path extends string> = Simplify<ParamScan<Path>>;

/** Documented reasons a path literal is rejected at the type level. */
export type RoutePathError =
  | "path must start with '/'"
  | "empty path segment"
  | "'*' is only allowed as a bare final segment"
  | "parameter name is empty"
  | "optional parameters are not supported";

type ParamNameCheck<Name extends string> = Name extends ""
  ? "parameter name is empty"
  : Name extends `${string}?${string}` | `${string}+${string}`
    ? "optional parameters are not supported"
    : Name extends `${string}*${string}`
      ? "'*' is only allowed as a bare final segment"
      : true;

type TailCheck<Remainder extends string> = Remainder extends ""
  ? true
  : Remainder extends `${infer Segment}/${infer Rest}`
    ? Segment extends ""
      ? "empty path segment"
      : Segment extends "*"
        ? Rest extends ""
          ? true
          : "'*' is only allowed as a bare final segment"
        : Segment extends `:${infer Name}`
          ? ParamNameCheck<Name> extends true
            ? TailCheck<Rest>
            : ParamNameCheck<Name>
          : TailCheck<Rest>
    : Remainder extends "*"
      ? true
      : Remainder extends `*${string}`
        ? "'*' is only allowed as a bare final segment"
        : Remainder extends `:${infer Name}`
          ? ParamNameCheck<Name>
          : true;

/**
 * Compile-time path contract: `/`-prefixed, non-empty segments, `:name`
 * parameters with plain names, and at most one bare trailing `*` wildcard.
 * A trailing slash is tolerated here and normalized by the GH-014 runtime
 * validator, which also rejects patterns this type cannot see (for example a
 * stray `:` inside a static segment).
 */
export type ValidateRoutePath<Path extends string> = Path extends "/"
  ? true
  : Path extends `/${infer Tail}`
    ? TailCheck<Tail>
    : "path must start with '/'";

/**
 * Handler contract frozen by ADR-0016: a route handler receives the request
 * and the path parameters and returns `Response | Promise<Response>`. There
 * is no implicit return-value language; GH-017 extends the first argument
 * with the request context without changing the return contract.
 */
export type RouteHandler<Params = RouteParams<string>> = (
  request: Request,
  params: Params,
) => Response | Promise<Response>;

/** Duplicate-method marker. */
export type DuplicateMethodError = "route methods must not contain duplicates";

type HasDuplicate<Methods extends readonly unknown[]> =
  Methods extends readonly [infer Head, ...infer Rest]
    ? Head extends Rest[number]
      ? true
      : HasDuplicate<Rest>
    : false;

/**
 * Methods field of a route descriptor. Duplicate methods are rejected for
 * const tuples (the common literal case); unbounded arrays cannot be verified
 * at the type level and are validated at runtime by GH-014.
 */
export type RouteMethods<Methods extends readonly HttpMethod[]> =
  HasDuplicate<Methods> extends true ? DuplicateMethodError : Methods;

/**
 * Metadata extension point: arbitrary read-only data that travels with a
 * route and never affects dispatch.
 */
export type RouteMetadata = Readonly<Record<string, unknown>>;

/** A route whose behavior is a callable handler. */
export type HandlerRoute<
  Path extends string = string,
  Methods extends readonly HttpMethod[] = readonly HttpMethod[],
> = {
  readonly path: Path;
  readonly methods: RouteMethods<Methods>;
  readonly handler: RouteHandler<RouteParams<Path>>;
  readonly meta?: RouteMetadata;
};

/**
 * A route that answers with a `Response` constructed once at startup. Modeled
 * separately from callable handlers so GH-015/GH-016 can hand the instance
 * straight to `Bun.serve` without per-request allocation.
 */
export type StaticRoute<
  Path extends string = string,
  Methods extends readonly HttpMethod[] = readonly HttpMethod[],
> = {
  readonly path: Path;
  readonly methods: RouteMethods<Methods>;
  readonly response: Response;
  readonly meta?: RouteMetadata;
};

export type RouteDescriptor<
  Path extends string = string,
  Methods extends readonly HttpMethod[] = readonly HttpMethod[],
> = HandlerRoute<Path, Methods> | StaticRoute<Path, Methods>;
