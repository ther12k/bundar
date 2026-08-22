/**
 * GH-074 in-process client coverage: ONE App fixture exercised across all
 * four request modes (ordinary/no-JS, htmx2, htmx4 beta, and raw fetch),
 * plus cookie-jar round-trips, PRG redirect chains, form bodies, params,
 * static responses, 404/405 semantics, and the documented error-surfacing
 * difference (rethrow without an error hook; hook mirroring with one).
 */
import { describe, expect, test } from "bun:test";
import { App, text } from "@bundar/core";
import { parseForm } from "@bundar/core";
import { htmx2 } from "@bundar/htmx/2";
import { htmx4Experimental } from "@bundar/htmx/4";
import { action, actionResponse, view } from "@bundar/htmx";
import { document, jsx } from "@bundar/jsx";
import { createTestClient, inject } from "../src/index";

/** The one fixture: negotiated list view + PRG create + params + cookie. */
function createFixtureApp(): App {
  const app = new App();
  app.get("/", () => text("home"));

  // negotiated: document for ordinary, fragment for enhanced
  app.get("/items", (context) =>
    view(context.request, {
      fragment: () => jsx("ul", { id: "items-fragment", children: "fragment" }),
      layout: (content) =>
        document({
          lang: "en",
          title: "Items",
          children: jsx("div", { id: "doc", children: content }),
        }),
    }),
  );

  // PRG for ordinary, fragment for enhanced; sets a cookie
  app.post("/items", async (context) => {
    const form = await parseForm(context);
    const title = form.get("title") ?? "";
    return actionResponse(
      context.request,
      action({
        fragment: jsx("li", { "data-title": title, children: title }),
        redirectTo: "/items",
      }),
    );
  });

  app.get("/items/:id", (context) =>
    text(`item:${context.params["id"] ?? ""}`),
  );

  app.get("/whoami", (context) => {
    const sid = context.request.headers.get("cookie") ?? "none";
    return text(sid, {
      headers: { "set-cookie": "bundar.session=in-process-test" },
    });
  });

  app.get("/teapot", () => text("short and stout", { status: 418 }));

  app.get("/boom", () => {
    throw new Error("in-process failures must surface in tests");
  });

  return app;
}

describe("GH-074 createTestClient — one fixture, four modes", () => {
  const app = createFixtureApp();

  test("ordinary (no-JS) GET receives the full document", async () => {
    const client = createTestClient(app);
    const response = await client.get("/items");
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<html");
    expect(html).toContain('id="doc"');
  });

  test("htmx2 enhanced GET receives the fragment", async () => {
    const client = createTestClient(app, { dialect: htmx2 });
    const response = await client.enhancedGet("/items", { target: "#list" });
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('id="items-fragment"');
    expect(body).not.toContain("<html");
  });

  test("htmx4 enhanced GET receives the same fragment", async () => {
    const client = createTestClient(app, { dialect: htmx4Experimental });
    const response = await client.enhancedGet("/items", {
      trigger: "add-btn",
    });
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('id="items-fragment"');
    // trigger-alias correctness is asserted in request.test.ts through the
    // adapter's own decoder (no raw protocol strings live in this package)
  });

  test("raw fetch path builds plain no-JS requests", async () => {
    const client = createTestClient(app);
    const response = await client.fetch("/items");
    expect(await response.text()).toContain("<html");
  });

  test("no-JS create follows the PRG chain to the document", async () => {
    const client = createTestClient(app);
    const created = await client.submitForm("/items", { title: "First" });
    expect(created.status).toBe(303);
    expect(created.headers.get("location")).toBe("/items");
    const settled = await client.follow(created);
    expect(settled.status).toBe(200);
    expect(await settled.text()).toContain("<html");
  });

  test("enhanced create returns the fragment without redirecting", async () => {
    const client = createTestClient(app, { dialect: htmx2 });
    const created = await client.enhancedSubmitForm(
      "/items",
      { title: "Enhanced" },
      { target: "#list" },
    );
    expect(created.status).toBe(200);
    expect(await created.text()).toContain('data-title="Enhanced"');
  });
});

describe("GH-074 createTestClient — protocol mechanics", () => {
  const app = createFixtureApp();

  test("params flow to handlers", async () => {
    const client = createTestClient(app);
    expect(await (await client.get("/items/42")).text()).toBe("item:42");
  });

  test("cookies round-trip through the jar", async () => {
    const client = createTestClient(app);
    await client.get("/whoami"); // sets bundar.session
    expect(client.jar.get("bundar.session")).toBe("in-process-test");
    const replay = await client.get("/whoami");
    expect(await replay.text()).toContain("bundar.session=in-process-test");
  });

  test("jar can be disabled for raw Set-Cookie assertions", async () => {
    const client = createTestClient(app, { cookies: false });
    const response = await client.get("/whoami");
    expect(response.headers.getSetCookie()).toContain(
      "bundar.session=in-process-test",
    );
    expect((await client.get("/whoami")).text()).resolves.not.toContain(
      "bundar.session",
    );
  });

  test("unknown paths hit the application 404", async () => {
    const client = createTestClient(app);
    const response = await client.get("/missing");
    expect(response.status).toBe(404);
  });

  test("wrong methods report 405 with allowed methods", async () => {
    const client = createTestClient(app);
    const response = await client.delete("/items");
    expect(response.status).toBe(405);
    expect((response.headers.get("allow") ?? "").split(", ")).toEqual(
      expect.arrayContaining(["GET", "POST"]),
    );
  });

  test("error statuses pass through untouched", async () => {
    const client = createTestClient(app);
    expect((await client.get("/teapot")).status).toBe(418);
  });

  test("thrown errors REJECT without an error hook (documented semantics)", async () => {
    const client = createTestClient(app);
    expect(client.get("/boom")).rejects.toThrow(
      "in-process failures must surface",
    );
  });

  test("with an error hook the client mirrors the server", async () => {
    const client = createTestClient(
      app.compile({
        error: () => text("hook-caught", { status: 500 }),
      }),
    );
    const response = await client.get("/boom");
    expect(response.status).toBe(500);
    expect(await response.text()).toBe("hook-caught");
  });

  test("dispose clears jar state", async () => {
    const client = createTestClient(app);
    await client.get("/whoami");
    client.dispose();
    expect(client.jar.size).toBe(0);
  });

  test("inject runs a one-shot request", async () => {
    const response = await inject(app, "/items/7");
    expect(await response.text()).toBe("item:7");
  });
});
