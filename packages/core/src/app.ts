import {
  cloneRouteDescriptor,
  defineModule,
  freezeManifest,
  joinRoutePath,
  type RouteManifest,
  type RouteModule,
} from "./module";
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

  public constructor(
    private readonly prefix = "",
    private readonly sink?: RouteSink,
  ) {}

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

    this.register(cloneRouteDescriptor(descriptor, this.prefix));
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
    const group = new App(joinRoutePath(this.prefix, prefix), (route) =>
      this.register(route),
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
    for (const route of routes) {
      this.register(
        cloneRouteDescriptor(route, joinRoutePath(this.prefix, prefix)),
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

  private register(route: RouteDescriptor): void {
    const copy = cloneRouteDescriptor(route);
    this.registered.push(copy);
    this.sink?.(copy);
  }
}
