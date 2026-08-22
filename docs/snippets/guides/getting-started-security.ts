/** Guide snippet: getting-started §5 (sessions in the main path) — CI-run. */
import type { App } from "@bundar/core";
import { createMemorySessionStore, sessionMiddleware } from "@bundar/security";

export function attachSessions(app: App): void {
  // tests/single-process demos only — production uses a durable store
  app.use(sessionMiddleware({ store: createMemorySessionStore() }));
}
