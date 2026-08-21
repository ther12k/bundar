import { isHttpMethod, type HttpMethod, type RouteDescriptor } from "./types";
import {
  normalizeRouteDescriptor,
  normalizeRoutePath,
  type RoutePathIssue,
} from "./path";

export type RouteDeclaration = Readonly<{
  route: RouteDescriptor;
  source?: string;
}>;

export type RouteConflictKind =
  "duplicate-route" | "duplicate-method" | "handler-static-mismatch";

export type RouteConflict = Readonly<{
  kind: RouteConflictKind;
  path: string;
  method: HttpMethod;
  firstSource: string;
  secondSource: string;
}>;

export class RouteConflictError extends Error {
  public readonly conflict: RouteConflict;

  public constructor(conflict: RouteConflict) {
    super(
      `route conflict for ${conflict.method} ${conflict.path}: ` +
        `${conflict.kind} between ${conflict.firstSource} and ${conflict.secondSource}`,
    );
    this.name = "RouteConflictError";
    this.conflict = conflict;
  }
}

export class RouteValidationError extends Error {
  public readonly issue: RoutePathIssue | "invalid HTTP method";
  public readonly path: string;

  public constructor(
    issue: RoutePathIssue | "invalid HTTP method",
    path: string,
  ) {
    super(`invalid route declaration for ${JSON.stringify(path)}: ${issue}`);
    this.name = "RouteValidationError";
    this.issue = issue;
    this.path = path;
  }
}

function sanitizeSource(source: string): string {
  const controlSafe = [...source]
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? "?" : character;
    })
    .join("");
  return controlSafe.replace(
    /(?:[A-Za-z]:)?\/(?:[^/\s]+\/)+[^/\s]*/g,
    "<path>",
  );
}

function sourceLabel(source: string | undefined, index: number): string {
  if (!source || source.trim() === "") {
    return `declaration ${index + 1}`;
  }
  // Source labels are caller-provided diagnostics, never filesystem paths.
  return sanitizeSource(source).slice(0, 120);
}

function routeKind(route: RouteDescriptor): "handler" | "static" {
  return "handler" in route ? "handler" : "static";
}

/**
 * Validates and returns a normalized manifest. Routes sharing a path may use
 * different methods. The same normalized path/method pair is rejected even if
 * slash spelling differed, and handler/static replacements are never silently
 * accepted. Bun's own static-versus-parameter precedence is intentionally not
 * reimplemented here; GH-015 preserves it while compiling native tables.
 */
export function validateRouteConflicts(
  declarations: readonly RouteDeclaration[],
): readonly RouteDescriptor[] {
  const normalized: RouteDescriptor[] = [];
  const seen = new Map<string, { route: RouteDescriptor; source: string }>();

  declarations.forEach((declaration, index) => {
    const route = normalizeRouteDescriptor(declaration.route);
    const source = sourceLabel(declaration.source, index);
    const methods = new Set<string>();

    for (const method of route.methods as readonly string[]) {
      if (!isHttpMethod(method)) {
        throw new RouteValidationError("invalid HTTP method", route.path);
      }
      if (methods.has(method)) {
        throw new RouteConflictError({
          kind: "duplicate-method",
          path: route.path,
          method,
          firstSource: source,
          secondSource: source,
        });
      }
      methods.add(method);

      const key = `${method}\u0000${route.path}`;
      const previous = seen.get(key);
      if (previous) {
        throw new RouteConflictError({
          kind:
            routeKind(previous.route) === routeKind(route)
              ? "duplicate-route"
              : "handler-static-mismatch",
          path: route.path,
          method,
          firstSource: previous.source,
          secondSource: source,
        });
      }
      seen.set(key, { route, source });
    }

    normalized.push(route);
  });

  return Object.freeze(normalized);
}

export function assertRouteConflictsFree(
  declarations: readonly RouteDeclaration[],
): void {
  validateRouteConflicts(declarations);
}

export function routeConflictKey(path: string, method: HttpMethod): string {
  return `${normalizeRoutePath(path)}\u0000${method}`;
}
