import { afterAll, describe, expect, test } from "bun:test";
import { App } from "../../src/app";

/**
 * BR-069: end-to-end HTTP method conformance across the route shapes the
 * acceptance criteria name - static Response, sync handler, async handler,
 * wildcard, parameter, group/module, and a custom fallback route - against a
 * live Bun server compiled through the real App -> compileRoutes path.
 */
const staticResponse = new Response("static-ok");

const app = new App();
app
  .route("/static", ["GET"], staticResponse)
  .get("/sync", () => new Response("sync-ok"))
  .get("/async", async () => {
    await Promise.resolve();
    return new Response("async-ok");
  })
  .get("/wild/*", () => new Response("wild-ok"))
  .get("/items/:id", (_ctx, params) => new Response(`item-${params.id}`))
  .post("/items/:id", (_ctx, params) => new Response(`created-${params.id}`))
  .options("/explicit-options", () => new Response("custom-options-ok"))
  .group("/grp", (group) => {
    group.get("/sub", () => new Response("group-ok"));
  })
  .mount("/mounted", [
    {
      path: "/route",
      methods: ["GET"],
      handler: () => new Response("mounted-ok"),
    },
  ]);

const server = app.serve({ port: 0 });
afterAll(() => server.stop(true));

const base = () => `http://localhost:${server.port}`;

async function request(method: string, path: string) {
  return fetch(`${base()}${path}`, { method });
}

describe("BR-069 405 with Allow across route shapes", () => {
  const cases: Array<[string, string]> = [
    ["static Response route", "/static"],
    ["sync handler route", "/sync"],
    ["async handler route", "/async"],
    ["wildcard route", "/wild/anything/here"],
    ["parameter route", "/items/42"],
    ["group route", "/grp/sub"],
    ["mounted module route", "/mounted/route"],
  ];

  for (const [label, path] of cases) {
    test(`${label}: an unregistered method 405s with a matching Allow header`, async () => {
      const response = await request("DELETE", path);
      expect(response.status).toBe(405);
      expect(response.headers.get("Allow")).toContain("GET");
      expect(response.headers.get("Allow")).toContain("OPTIONS");
    });
  }

  test("a genuinely unknown path still 404s, untouched by method-gap filling", async () => {
    const response = await request("GET", "/this/path/was/never/registered");
    expect(response.status).toBe(404);
  });

  test("registered methods on a two-method path answer normally, the rest 405", async () => {
    const get = await request("GET", "/items/7");
    expect(get.status).toBe(200);
    expect(await get.text()).toBe("item-7");

    const post = await request("POST", "/items/7");
    expect(post.status).toBe(200);
    expect(await post.text()).toBe("created-7");

    const put = await request("PUT", "/items/7");
    expect(put.status).toBe(405);
    expect(put.headers.get("Allow")).toBe("GET, HEAD, OPTIONS, POST");
  });
});

describe("BR-069 OPTIONS: automatic vs explicit", () => {
  test("a path with no explicit OPTIONS gets an automatic 204 with Allow", async () => {
    const response = await request("OPTIONS", "/sync");
    expect(response.status).toBe(204);
    expect(response.headers.get("Allow")).toBe("GET, HEAD, OPTIONS");
    expect(await response.text()).toBe("");
  });

  test("an explicit OPTIONS registration is never shadowed by the automatic one", async () => {
    const response = await request("OPTIONS", "/explicit-options");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("custom-options-ok");
  });
});

describe("BR-069 HEAD still has GET parity after the fix", () => {
  test("HEAD on a GET-only route returns GET's status/headers with no body", async () => {
    const response = await request("HEAD", "/sync");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });

  test("HEAD 405s, with Allow, on a path that never registered GET", async () => {
    const postOnly = new App();
    postOnly.post("/write-only", () => new Response("written"));
    const postOnlyServer = postOnly.serve({ port: 0 });
    try {
      const response = await fetch(
        `http://localhost:${postOnlyServer.port}/write-only`,
        { method: "HEAD" },
      );
      expect(response.status).toBe(405);
      expect(response.headers.get("Allow")).toBe("OPTIONS, POST");
    } finally {
      postOnlyServer.stop(true);
    }
  });
});
