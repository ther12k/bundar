import { describe, expect, test } from "bun:test";
import { App, text } from "@bundar/core";
import type { Surface } from "./fixture";

describe("GH-023 external core type consumption", () => {
  test("the typed fixture module executes and the shapes hold", async () => {
    const core = await import("@bundar/core");
    expect(typeof core.App).toBe("function");
    expect(typeof core.ErrorBoundary).toBe("function");
    expect(typeof core.HttpError).toBe("function");
    expect(typeof core.compileRoutes).toBe("function");
    expect(typeof core.buildRouteManifest).toBe("function");

    // exercise the typed surface end-to-end as an external app would
    const app = new App();
    app.get("/hello/:name", (context) => text(`hi:${context.params.name}`));
    const server = app.serve({ port: 0 });
    try {
      const response = await fetch(
        `http://localhost:${server.port}/hello/world`,
      );
      expect(await response.text()).toBe("hi:world");
    } finally {
      server.stop(true);
    }
    void null as unknown as Surface;
  });
});
