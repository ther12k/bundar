import { afterAll, describe, expect, test } from "bun:test";
import { App } from "../../src/app";
import { defaultNotFound } from "../../src/routing/compiler";

/**
 * GH-022 terminal behaviors: unknown paths, method mismatch, HEAD/GET
 * parity, and explicit-route precedence — against a live Bun server.
 */
const customNotFoundBody = "app-level 404 page";

const app = new App();
app
  .get("/known", () => new Response("known-get"))
  .head(
    "/known",
    () =>
      new Response(null, {
        headers: { "content-type": "text/plain; charset=utf-8" },
      }),
  )
  .post("/known", () => new Response("known-post", { status: 201 }))
  .route("/only-put", ["PUT"], () => new Response("put-ok"));

const server = app.serve({
  port: 0,
  notFound: () =>
    new Response(customNotFoundBody, {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    }),
});

afterAll(() => server.stop(true));

describe("GH-022 not-found terminal behavior", () => {
  test("unknown path returns the configured 404", async () => {
    const response = await fetch(
      `http://localhost:${server.port}/definitely-unknown`,
    );
    expect(response.status).toBe(404);
    expect(await response.text()).toBe(customNotFoundBody);
    expect(response.headers.get("content-type")).toBe(
      "text/html; charset=utf-8",
    );
  });

  test("default 404 applies when notFound is not configured", async () => {
    const plain = new App().serve({ port: 0 });
    try {
      const response = await fetch(`http://localhost:${plain.port}/x`);
      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Not Found");
      expect(defaultNotFound().status).toBe(404);
    } finally {
      plain.stop(true);
    }
  });

  test("unknown path under a known prefix still 404s via fetch", async () => {
    const response = await fetch(`http://localhost:${server.port}/known/sub`);
    expect(response.status).toBe(404);
  });
});

describe("GH-022 method behaviors", () => {
  test("explicit method handlers are never shadowed by defaults", async () => {
    const get = await fetch(`http://localhost:${server.port}/known`);
    expect(get.status).toBe(200);
    expect(await get.text()).toBe("known-get");

    const post = await fetch(`http://localhost:${server.port}/known`, {
      method: "POST",
    });
    expect(post.status).toBe(201);
    expect(await post.text()).toBe("known-post");
  });

  test("method mismatch surfaces Bun's native 404/405 behavior", async () => {
    // /only-put exists only for PUT: Bun's route table has a single-method
    // path entry; the wrong method falls through to fetch (404 by Bun's
    // documented behavior — Bundar does not invent method negotiation).
    const wrong = await fetch(`http://localhost:${server.port}/only-put`);
    expect([404, 405]).toContain(wrong.status);

    const right = await fetch(`http://localhost:${server.port}/only-put`, {
      method: "PUT",
    });
    expect(right.status).toBe(200);
    expect(await right.text()).toBe("put-ok");
  });

  test("HEAD has parity with GET on explicitly-registered HEAD routes", async () => {
    const head = await fetch(`http://localhost:${server.port}/known`, {
      method: "HEAD",
    });
    expect(head.status).toBe(200);
    expect(head.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    // HEAD responses carry headers but no body
    expect(await head.text()).toBe("");
  });
});
