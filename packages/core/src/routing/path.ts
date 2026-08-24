import type { RouteDescriptor } from "./types";

export type RoutePathIssue =
  | "path must start with '/'"
  | "path must not be empty"
  | "path contains an empty parameter name"
  | "optional parameters are not supported"
  | "wildcard must be a bare final segment"
  | "parameter names must use identifier characters"
  | "static segments must not contain ':'";

function sanitizeText(value: string): string {
  return [...value]
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? "?" : character;
    })
    .join("");
}

function displayPath(path: string): string {
  return JSON.stringify(sanitizeText(path));
}

export class RoutePathValidationError extends Error {
  public readonly issue: RoutePathIssue;
  public readonly path: string;

  public constructor(issue: RoutePathIssue, path: string) {
    super(`invalid route path ${displayPath(path)}: ${issue}`);
    this.name = "RoutePathValidationError";
    this.issue = issue;
    this.path = path;
  }
}

function validateSegment(
  segment: string,
  path: string,
  isFinal: boolean,
): void {
  if (segment === "*") {
    if (!isFinal) {
      throw new RoutePathValidationError(
        "wildcard must be a bare final segment",
        path,
      );
    }
    return;
  }

  if (segment.includes("*")) {
    throw new RoutePathValidationError(
      "wildcard must be a bare final segment",
      path,
    );
  }

  if (segment.startsWith(":")) {
    const name = segment.slice(1);
    if (name === "") {
      throw new RoutePathValidationError(
        "path contains an empty parameter name",
        path,
      );
    }
    if (name.includes("?") || name.includes("+")) {
      throw new RoutePathValidationError(
        "optional parameters are not supported",
        path,
      );
    }
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      throw new RoutePathValidationError(
        "parameter names must use identifier characters",
        path,
      );
    }
    return;
  }

  if (segment.includes(":")) {
    throw new RoutePathValidationError(
      "static segments must not contain ':'",
      path,
    );
  }
}

/**
 * Canonicalizes a route pattern for use by the conflict checker. Repeated
 * separators and a trailing separator are equivalent; wildcard syntax is only
 * the Bun-native bare final `*` segment. This function does not decode URLs or
 * invent optional/regex patterns.
 */
export function normalizeRoutePath(path: string): string {
  if (path.length === 0) {
    throw new RoutePathValidationError("path must not be empty", path);
  }
  if (!path.startsWith("/")) {
    throw new RoutePathValidationError("path must start with '/'", path);
  }
  // BR-068 property finding: CR/LF/control characters must never survive
  // normalization into the compiled route table (log/header injection).
  // eslint-disable-next-line no-control-regex -- intentional: detects injection
  if (/[\u0000-\u001f\u007f\u0080-\u009f]/.test(path)) {
    throw new RoutePathValidationError(
      "path contains control characters",
      path,
    );
  }
  if (path === "/") {
    return "/";
  }

  const segments = path.split("/").filter((segment) => segment !== "");
  if (segments.length === 0) {
    return "/";
  }

  const final = segments.length - 1;
  segments.forEach((segment, index) => {
    validateSegment(segment, path, index === final);
  });
  return `/${segments.join("/")}`;
}

export function normalizeRouteDescriptor(
  route: RouteDescriptor,
): RouteDescriptor {
  const path = normalizeRoutePath(route.path);
  const methods = Object.freeze([...route.methods]);
  const meta = route.meta ? Object.freeze({ ...route.meta }) : undefined;

  if ("handler" in route) {
    return Object.freeze({
      path,
      methods,
      handler: route.handler,
      ...(meta ? { meta } : {}),
    });
  }

  return Object.freeze({
    path,
    methods,
    response: route.response,
    ...(meta ? { meta } : {}),
  });
}

export function normalizeRouteDescriptors(
  routes: readonly RouteDescriptor[],
): readonly RouteDescriptor[] {
  return Object.freeze(routes.map(normalizeRouteDescriptor));
}
