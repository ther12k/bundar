/**
 * GH-023 external type-consumer fixture: consumes @bundar/core public types
 * through the workspace package name (as an external app would). The file
 * typechecks against the package's exported declarations; the runtime test
 * below re-imports it to prove the module executes.
 */
import type {
  App,
  CompiledServerOptions,
  Context,
  CookieMutations,
  ErrorBoundary,
  HttpError,
  Middleware,
  RouteDescriptor,
  RouteManifest,
} from "@bundar/core";

export type Surface = {
  app: App;
  options: CompiledServerOptions;
  context: Context;
  cookies: CookieMutations;
  boundary: ErrorBoundary;
  failure: HttpError;
  middleware: Middleware;
  descriptor: RouteDescriptor;
  manifest: RouteManifest;
};
