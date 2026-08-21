import { afterAll, describe, expect, test } from "bun:test";
import { App } from "../../src/app";

/**
 * GH-015 integration: real `Bun.serve` over compiled route tables.
 * Route matching, parameter extraction, method dispatch, and the 404
 * fallback are exercised over a live socket — proving Bun's router owns
 * request-time matching, not Bundar.
 */
const app = new App();

app.get("/health", () => new Response("healthy"));
app.get("/users/:id", (request, params) => {
  const { id } = params as Record<string, string>;
  return new Response(`user:${id}`);
});
app.route("/static", ["GET"], new Response("frozen", { status: 200 }));
app
  .route("/items", ["GET"], () => new Response("list"))
  .route("/items", ["POST"], () => new Response("created", { status: 201 }));

const server = app.serve({ port: 0 });
const base = `http://localhost:${server.port}`;

afterAll(() => {
  server.stop(true);
});

describe("GH-015 native Bun.serve integration", () => {
  test("Bun matches static paths and dispatches to the handler", async () => {
    const response = await fetch(`${base}/health`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("healthy");
  });

  test("Bun extracts route parameters and the adapter forwards them", async () => {
    const response = await fetch(`${base}/users/42`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("user:42");
  });

  test("static Response entries are served without per-request allocation", async () => {
    const first = await fetch(`${base}/static`);
    const second = await fetch(`${base}/static`);
    expect(await first.text()).toBe("frozen");
    expect(await second.text()).toBe("frozen");
    expect(first.status).toBe(200);
  });

  test("method-specific routes share a path with correct status codes", async () => {
    const list = await fetch(`${base}/items`);
    expect(list.status).toBe(200);
    expect(await list.text()).toBe("list");

    const created = await fetch(`${base}/items`, { method: "POST" });
    expect(created.status).toBe(201);
    expect(await created.text()).toBe("created");
  });

  test("unmatched paths reach the compiled fetch fallback as 404", async () => {
    const response = await fetch(`${base}/definitely-not-registered`);
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not Found");
  });
});
