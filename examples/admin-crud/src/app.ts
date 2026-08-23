/**
 * Admin CRUD reference application — application composition (BR-042).
 *
 * Demonstrates the business-application shape: an authenticated fixture
 * with SERVER-SIDE role checks (viewer/editor/admin), optimistic
 * concurrency (409), delete restricted to admins, and page/fragment error
 * negotiation — all from ONE handler set for no-JS and enhanced browsers.
 * Authorization reads ONLY the session; HTMX metadata is never consulted.
 *
 * Per ADR-0019 this module only wires platform concerns (sessions, CSRF,
 * error boundary) and registers the articles feature's routes. Handler
 * logic lives in `features/articles/*`.
 *
 * Real applications plug a durable session store and a database behind
 * the same repository interface (docs/examples/admin.md).
 */
import { App, ErrorBoundary } from "@bundar/core";
import {
  createCsrfSecret,
  createMemorySessionStore,
  csrfMiddleware,
  sessionMiddleware,
  type CsrfSecret,
} from "@bundar/security";
import type { HtmxDialectAdapter } from "@bundar/htmx";
import type { ArticleRepository } from "./features/articles/articles.types";
import { registerArticleRoutes } from "./features/articles/articles.routes";
import { dialect as defaultDialect } from "./platform/dialect";

export interface CreateAdminAppOptions {
  readonly repository: ArticleRepository;
  readonly dialect?: HtmxDialectAdapter;
  readonly csrfSecret?: CsrfSecret;
}

export function createAdminApp(options: CreateAdminAppOptions): {
  app: App;
  repository: ArticleRepository;
  start: (port?: number) => ReturnType<typeof Bun.serve>;
} {
  const dialect = options.dialect ?? defaultDialect;
  const csrfSecret = options.csrfSecret ?? createCsrfSecret();

  const app = new App();
  app.use(
    sessionMiddleware({ store: createMemorySessionStore(), secure: false }),
  );

  registerArticleRoutes(app, {
    repository: options.repository,
    csrfSecret,
    dialect,
    csrf: csrfMiddleware({ secret: csrfSecret }),
  });

  const boundary = new ErrorBoundary({ development: false });
  const start = (port = 0): ReturnType<typeof Bun.serve> =>
    Bun.serve({
      ...app.compile(),
      port,
      error: (error: Error) => boundary.capture(error),
    });

  return { app, repository: options.repository, start };
}
