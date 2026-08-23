/**
 * Application composition (BR-030): wire feature routes onto one App.
 * Per ADR-0019 this file must not accumulate handler logic — the
 * subscribe feature owns its routes; cross-cutting wiring lives here.
 */
import { App, text } from "@bundar/core";
import { createHtmxAssetHandler } from "@bundar/htmx";
import { dialect } from "./platform/dialect";
import { registerSubscribeRoutes } from "./features/subscribe/subscribe.routes";

export function createApp(): App {
  const app = new App();
  const assets = createHtmxAssetHandler({ dialect });

  // Local htmx asset served from the framework's pinned vendor file.
  app.get("/assets/htmx.js", (context) => assets(context.request), {
    name: "asset-htmx",
  });

  app.get(
    "/healthz",
    () => text("ok", { headers: { "cache-control": "no-store" } }),
    {
      name: "health",
    },
  );

  registerSubscribeRoutes(app);

  return app;
}

export default createApp();
