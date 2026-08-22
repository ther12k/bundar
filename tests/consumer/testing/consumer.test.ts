/**
 * GH-074 external consumer: exercises @bundar/testing exactly as an app's
 * test suite would — in-process requests across no-JS and both HTMX
 * dialects from ONE fixture, cookie/redirect behavior, and the real-server
 * opt-in — importing only the package's public surface.
 */
import { describe, expect, test } from "bun:test";
import { App, text } from "@bundar/core";
import { view, action, actionResponse } from "@bundar/htmx";
import { htmx2 } from "@bundar/htmx/2";
import { htmx4Experimental } from "@bundar/htmx/4";
import { document, jsx } from "@bundar/jsx";
import {
  createTestClient,
  inject,
  startTestServer,
  withRealServer,
} from "@bundar/testing";
import type { Surface } from "./fixture";

const typed: Surface = null as unknown as Surface;
void typed;

function createApp(): App {
  const app = new App();
  app.get("/page", (context) =>
    view(context.request, {
      fragment: () => jsx("p", { id: "frag", children: "fragment" }),
      layout: (content) =>
        document({
          lang: "en",
          title: "Page",
          children: jsx("main", { children: content }),
        }),
    }),
  );
  app.post("/save", (context) =>
    actionResponse(
      context.request,
      action({
        fragment: jsx("p", { children: "saved" }),
        redirectTo: "/page",
      }),
    ),
  );
  app.get("/user", () =>
    text("u", { headers: { "set-cookie": "sid=consumer-test" } }),
  );
  app.get("/user/echo", (context) =>
    text(context.request.headers.get("cookie") ?? "anon"),
  );
  return app;
}

describe("GH-074 external @bundar/testing consumption", () => {
  test("in-process client: no-JS document vs both dialect fragments", async () => {
    const app = createApp();
    const noJs = await createTestClient(app).get("/page");
    expect(await noJs.text()).toContain("<html");

    for (const dialect of [htmx2, htmx4Experimental]) {
      const client = createTestClient(app, { dialect });
      const fragment = await client.enhancedGet("/page", { target: "#x" });
      const body = await fragment.text();
      expect(body).toContain('id="frag"');
      expect(body).not.toContain("<html");
    }
  });

  test("PRG chain, jar round-trip, and one-shot inject", async () => {
    const client = createTestClient(createApp());
    const saved = await client.submitForm("/save", { title: "t" });
    expect(saved.status).toBe(303);
    expect(await (await client.follow(saved)).text()).toContain("<html");

    await client.get("/user");
    expect(client.jar.get("sid")).toBe("consumer-test");
    expect(await (await client.get("/user/echo")).text()).toContain(
      "sid=consumer-test",
    );

    expect(await (await inject(createApp(), "/user/echo")).text()).toBe("anon");
  });

  test("real-server opt-in from the same public surface", async () => {
    const result = await withRealServer(createApp(), async (server) => {
      expect(server.mode).toBe("real-server");
      const response = await server.client.get("/page");
      return response.status;
    });
    expect(result).toBe(200);
  });

  test("startTestServer + stop are leak-safe together", async () => {
    const server = startTestServer(createApp());
    const port = server.port;
    server.stop();
    const rebound = startTestServer(createApp(), { port });
    try {
      expect((await rebound.client.get("/page")).status).toBe(200);
    } finally {
      rebound.stop();
    }
  });
});
