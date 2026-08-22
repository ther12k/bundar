/**
 * Server runner for dual-dialect fixture (GH-055).
 * Selects dialect adapter based on configuration / CLI option.
 */
import { htmx2 } from "@bundar/htmx/2";
import { htmx4Experimental } from "@bundar/htmx/4";
import { createDualApp } from "./app";

export function startDualServer(
  dialectId: "htmx2" | "htmx4" = "htmx2",
): ReturnType<typeof Bun.serve> {
  const dialect = dialectId === "htmx4" ? htmx4Experimental : htmx2;
  const app = createDualApp({ dialect });
  return app.serve({ port: 0 });
}

if (import.meta.main) {
  const arg = process.argv[2] === "htmx4" ? "htmx4" : "htmx2";
  const server = startDualServer(arg);
  console.log(
    `Dual-dialect server running on http://127.0.0.1:${server.port} (${arg})`,
  );
}
