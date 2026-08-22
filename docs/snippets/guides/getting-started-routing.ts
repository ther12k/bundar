/** Guide snippet: getting-started §2 (routing) — CI-run via tests/docs. */
import { App, text } from "@bundar/core";

export const app = new App();
app.get("/healthz", () =>
  text("ok", { headers: { "cache-control": "no-store" } }),
);
