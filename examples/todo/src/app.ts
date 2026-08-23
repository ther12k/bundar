/**
 * Todo reference application — application composition (BR-036).
 *
 * Per ADR-0019 this module only wires platform concerns (sessions, CSRF,
 * error boundary) and registers the todos feature's routes. Handler logic
 * lives in `features/todos/*`; views in `todos.view.tsx`; validation in
 * `todos.schema.ts`; persistence in `todos.repository.ts`.
 *
 * Dialect is injected at construction — zero version conditionals here.
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
import type { TodoRepository } from "./features/todos/todos.types";
import { registerTodoRoutes } from "./features/todos/todos.routes";
import { dialect as defaultDialect } from "./platform/dialect";

export interface CreateTodoAppOptions {
  readonly repository: TodoRepository;
  /** Dialect adapter; defaults to the stable bootstrap choice. */
  readonly dialect?: HtmxDialectAdapter;
  readonly csrfSecret?: CsrfSecret;
}

export function createTodoApp(options: CreateTodoAppOptions): {
  app: App;
  repository: TodoRepository;
  start: (port?: number) => ReturnType<typeof Bun.serve>;
} {
  const dialect = options.dialect ?? defaultDialect;
  const csrfSecret = options.csrfSecret ?? createCsrfSecret();

  const app = new App();
  app.use(
    sessionMiddleware({ store: createMemorySessionStore(), secure: false }),
  );

  registerTodoRoutes(app, {
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
