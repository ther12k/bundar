import type { RouteDescriptor } from "./routing/types";

export type RouteManifest = Readonly<{
  routes: readonly RouteDescriptor[];
}>;

export type RouteModule = Readonly<{
  routes: readonly RouteDescriptor[];
  manifest(): RouteManifest;
}>;

function cloneMetadata(meta: RouteDescriptor["meta"]): RouteDescriptor["meta"] {
  return meta ? Object.freeze({ ...meta }) : undefined;
}

export function joinRoutePath(prefix: string, path: string): string {
  if (prefix === "" || prefix === "/") {
    return path === "" ? "/" : path.startsWith("/") ? path : `/${path}`;
  }

  const left = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  const right =
    path === "" || path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  const joined = `${left}${right}`;
  return joined === "" ? "/" : joined;
}

export function cloneRouteDescriptor(
  route: RouteDescriptor,
  prefix = "",
): RouteDescriptor {
  const path = joinRoutePath(prefix, route.path);
  const methods = Object.freeze([...route.methods]);
  const meta = cloneMetadata(route.meta);

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

export function freezeManifest(
  routes: readonly RouteDescriptor[],
): RouteManifest {
  const snapshot = Object.freeze(
    routes.map((route) => cloneRouteDescriptor(route)),
  );
  return Object.freeze({ routes: snapshot });
}

export function defineModule(routes: readonly RouteDescriptor[]): RouteModule {
  const source = Object.freeze(
    routes.map((route) => cloneRouteDescriptor(route)),
  );
  return Object.freeze({
    routes: source,
    manifest: () => freezeManifest(source),
  });
}
