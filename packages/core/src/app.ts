import {
  cloneRouteDescriptor,
  defineModule,
  freezeManifest,
  joinRoutePath,
  type RouteManifest,
  type RouteModule,
} from "./module";
import type { ServiceMap } from "./context";
import type { ContextServicesOptions } from "./context";
import type { Middleware } from "./middleware";
import { compileRoutes, type CompiledServerOptions } from "./routing/compiler";
import type {
  HttpMethod,
  RouteDescriptor,
  RouteHandler,
  RouteMetadata,
  RouteParams,
} from "./routing/types";

export type RouteAction<Path extends string> =
  RouteHandler<RouteParams<Path>> | Response;

type RouteSink = (route: RouteDescriptor) => void;

/**
 * Mutable registration facade over an immutable route manifest model.
 * Registration never starts a server; GH-015 owns compilation to Bun.serve.
 */
export class App {
  private readonly registered: RouteDescriptor[] = [];
  /** Middleware scoped to this App level; composition happens at compile. */
  private readonly scopedMiddleware: Middleware[] = [];
  /**
   * Lazy thunk for the enclosing scope's chain. Laziness is required so
   * `use()` calls made after a group is created still apply to it.
   */
  private readonly parentChain: () => readonly Middleware[];

  public constructor(
    private readonly prefix = "",
    private readonly sink?: RouteSink,
    parentChain: () => readonly Middleware[] = () => [],
  ) {
    this.parentChain = parentChain;
  }

  /** Attaches middleware to this App/group scope. */
  public use(...middlewares: Middleware[]): this {
    this.scopedMiddleware.push(...middlewares);
    return this;
  }

  /** Middleware effective for registrations made through this App. */
  public middlewareChain(): readonly Middleware[] {
    return Object.freeze([...this.parentChain(), ...this.scopedMiddleware]);
  }

  public route<Path extends string, Methods extends readonly HttpMethod[]>(
    descriptor: RouteDescriptor<Path, Methods>,
  ): this;
  public route<Path extends string, Methods extends readonly HttpMethod[]>(
    path: Path,
    methods: Methods,
    action: RouteAction<Path>,
    meta?: RouteMetadata,
  ): this;
  public route<Path extends string, Methods extends readonly HttpMethod[]>(
    descriptorOrPath: RouteDescriptor<Path, Methods> | Path,
    methods?: Methods,
    action?: RouteAction<Path>,
    meta?: RouteMetadata,
  ): this {
    const descriptor = (
      typeof descriptorOrPath === "string"
        ? action instanceof Response
          ? {
              path: descriptorOrPath,
              methods: methods ?? ([] as unknown as Methods),
              response: action,
              ...(meta ? { meta } : {}),
            }
          : {
              path: descriptorOrPath,
              methods: methods ?? ([] as unknown as Methods),
              handler: action as RouteHandler<RouteParams<Path>>,
              ...(meta ? { meta } : {}),
            }
        : descriptorOrPath
    ) as RouteDescriptor<Path, Methods>;

    // Registrations stamp the OWNING scope's chain; sinks only bubble the
    // already-stamped descriptor toward the root manifest.
    this.register(
      cloneRouteDescriptor(descriptor, this.prefix),
      this.middlewareChain(),
    );
    return this;
  }

  public get<Path extends string>(
    path: Path,
    action: RouteAction<Path>,
    meta?: RouteMetadata,
  ): this {
    return this.route(path, ["GET"], action, meta);
  }

  public head<Path extends string>(
    path: Path,
    action: RouteAction<Path>,
    meta?: RouteMetadata,
  ): this {
    return this.route(path, ["HEAD"], action, meta);
  }

  public post<Path extends string>(
    path: Path,
    action: RouteAction<Path>,
    meta?: RouteMetadata,
  ): this {
    return this.route(path, ["POST"], action, meta);
  }

  public put<Path extends string>(
    path: Path,
    action: RouteAction<Path>,
    meta?: RouteMetadata,
  ): this {
    return this.route(path, ["PUT"], action, meta);
  }

  public patch<Path extends string>(
    path: Path,
    action: RouteAction<Path>,
    meta?: RouteMetadata,
  ): this {
    return this.route(path, ["PATCH"], action, meta);
  }

  public delete<Path extends string>(
    path: Path,
    action: RouteAction<Path>,
    meta?: RouteMetadata,
  ): this {
    return this.route(path, ["DELETE"], action, meta);
  }

  public options<Path extends string>(
    path: Path,
    action: RouteAction<Path>,
    meta?: RouteMetadata,
  ): this {
    return this.route(path, ["OPTIONS"], action, meta);
  }

  public group(prefix: string, configure: (group: App) => void): this;
  public group(prefix: string): App;
  public group(prefix: string, configure?: (group: App) => void): this | App {
    // The child's parent-chain thunk is lazy, so parent `use()` calls after
    // group creation still apply. The sink only bubbles the child's
    // already-stamped descriptors — it never re-stamps middleware.
    const group = new App(
      joinRoutePath(this.prefix, prefix),
      (route) => this.register(route),
      () => this.middlewareChain(),
    );

    if (configure) {
      configure(group);
      return this;
    }

    return group;
  }

  public mount(
    prefix: string,
    module: RouteModule | readonly RouteDescriptor[],
  ): this {
    const routes = "routes" in module ? module.routes : module;
    // Scope boundary: mounting strips the module's own middleware chain and
    // applies the mounting app's chain instead. A module's middleware stays
    // with the module; it never crosses into the parent silently.
    for (const route of routes) {
      const moduleMeta = { ...(route.meta ?? {}) } as {
        middleware?: readonly Middleware[];
      };
      delete moduleMeta.middleware;
      const hasMeta = Object.keys(moduleMeta).length > 0;
      const stripped = {
        ...route,
        meta: hasMeta ? moduleMeta : undefined,
      } as RouteDescriptor;
      this.register(
        cloneRouteDescriptor(stripped, joinRoutePath(this.prefix, prefix)),
        this.middlewareChain(),
      );
    }
    return this;
  }

  public manifest(): RouteManifest {
    return freezeManifest(this.registered);
  }

  public module(): RouteModule {
    return defineModule(this.manifest().routes);
  }

  public compile(options: ContextServicesOptions = {}): CompiledServerOptions {
    // Middleware travels per-route under meta.middleware (stamped at
    // registration by the owning scope); no app-level duplication here.
    return compileRoutes(this.manifest().routes, options);
  }

  /**
   * Starts a Bun server from the compiled route table. Ownership is explicit:
   * the caller receives the `Bun.Server` instance and is responsible for
   * stopping it (`server.stop()`). `services` becomes the frozen app-level
   * service map exposed on every request context.
   */
  public serve(
    options: { port?: number; hostname?: string; services?: ServiceMap } = {},
  ): ReturnType<typeof Bun.serve> {
    const { port, hostname, services } = options;
    return Bun.serve({
      ...this.compile(services ? { services } : {}),
      port: port ?? 0,
      ...(hostname ? { hostname } : {}),
    });
  }

  private register(
    route: RouteDescriptor,
    middleware?: readonly Middleware[],
  ): void {
    // Route-level middleware travels under meta.middleware (a frozen array
    // whose reference survives cloneRouteDescriptor's meta spread), keeping
    // the frozen-descriptor contract intact.
    const inherited = (
      route.meta as { middleware?: readonly Middleware[] } | undefined
    )?.middleware;
    const combined = [...(inherited ?? []), ...(middleware ?? [])];
    const meta =
      combined.length > 0
        ? Object.freeze({
            ...(route.meta ?? {}),
            middleware: Object.freeze(combined),
          })
        : route.meta;

    const copy =
      "handler" in route
        ? Object.freeze({
            path: route.path,
            methods: Object.freeze([...route.methods]),
            handler: route.handler,
            ...(meta ? { meta } : {}),
          })
        : Object.freeze({
            path: route.path,
            methods: Object.freeze([...route.methods]),
            response: route.response,
            ...(meta ? { meta } : {}),
          });

    this.registered.push(copy);
    this.sink?.(copy);
  }
}
