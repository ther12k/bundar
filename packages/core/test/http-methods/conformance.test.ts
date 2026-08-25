/**
 * BR-069 HTTP method conformance: implicit HEAD, auto-OPTIONS, 405+Allow,
 * consistency across route forms, and a golden fixture capturing Bun's
 * native behavior so upstream changes fail loudly.
 */
import { describe, expect, test } from "bun:test";
import { App } from "../../src/app";

function buildApp() {
  const app = new App();
  app.route("/static", ["GET"], new Response("static-body"));
  app.get("/sync", () => new Response("sync"));
  app.get("/async", async () => new Response("async"));
  app.get("/multi", () => new Response("get"));
  app.post("/multi", () => new Response("post"));
  app.put("/multi", () => new Response("put"));
  app.get(
    "/users/:id",
    (ctx) => new Response("user-" + String(ctx.params["id"])),
  );
  app.get("/files/*", () => new Response("wildcard"));
  const sub = new App();
  sub.get("/thing", () => new Response("mod"));
  app.mount("/m", sub.module());
  return app;
}

const CASES: [string, string][] = [
  ["HEAD", "/static"],
  ["HEAD", "/sync"],
  ["HEAD", "/async"],
  ["HEAD", "/multi"],
  ["HEAD", "/missing"],
  ["OPTIONS", "/multi"],
  ["OPTIONS", "/static"],
  ["OPTIONS", "/users/7"],
  ["OPTIONS", "/missing"],
  ["DELETE", "/multi"],
  ["PATCH", "/users/7"],
  ["POST", "/files/a/b/c"],
  ["HEAD", "/m/thing"],
  ["GET", "/sync/"],
  ["GET", "/definitely-missing"],
];

async function probeAll(): Promise<Record<string, string>> {
  const server = Bun.serve({ ...buildApp().compile(), port: 0 });
  const base = "http://localhost:" + server.port;
  const out: Record<string, string> = {};
  for (const [method, path] of CASES) {
    const res = await fetch(base + path, { method });
    const body =
      method === "HEAD" || res.status !== 200 ? "" : await res.text();
    out[method + " " + path] =
      res.status + "|" + (res.headers.get("allow") ?? "-") + "|" + body;
  }
  const getRes = await fetch(base + "/sync");
  const headRes = await fetch(base + "/sync", { method: "HEAD" });
  out["GET vs HEAD /sync"] =
    getRes.status +
    "/" +
    (await getRes.text()).length +
    " vs " +
    headRes.status +
    "/" +
    (await headRes.text()).length;
  server.stop(true);
  return out;
}

describe("BR-069 HTTP method conformance", () => {
  test(
    "full matrix matches the documented policy fixture",
    async () => {
      const results = await probeAll();

      // Implicit HEAD: GET-equivalent status, EMPTY body, every route form.
      for (const key of [
        "HEAD /static",
        "HEAD /sync",
        "HEAD /async",
        "HEAD /multi",
        "HEAD /m/thing",
      ]) {
        expect(
          results[key]?.startsWith("200|"),
          key + ": " + results[key],
        ).toBe(true);
        expect(results[key]?.split("|")[2]).toBe("");
      }

      // Auto-OPTIONS: 204 + sorted Allow including implicit methods.
      expect(results["OPTIONS /multi"]).toBe(
        "204|GET, HEAD, OPTIONS, POST, PUT|",
      );
      expect(results["OPTIONS /static"]).toBe("204|GET, HEAD, OPTIONS|");

      // 405 + Allow when the path exists but the method does not.
      expect(results["DELETE /multi"]).toBe(
        "405|GET, HEAD, OPTIONS, POST, PUT|",
      );

      // Unknown PATH stays 404 (never 405) for any method.
      expect(results["HEAD /missing"]?.startsWith("404|")).toBe(true);
      expect(results["OPTIONS /missing"]?.startsWith("404|")).toBe(true);
      expect(results["GET /definitely-missing"]?.startsWith("404|")).toBe(true);

      // Parameter and wildcard routes participate identically.
      expect(results["PATCH /users/7"]).toBe("405|GET, HEAD, OPTIONS|");
      expect(results["POST /files/a/b/c"]).toBe("405|GET, HEAD, OPTIONS|");

      // Mounted module routes get the same policy.
      expect(results["HEAD /m/thing"]?.startsWith("200|")).toBe(true);

      // Trailing slash: NO implicit redirect/match (documented policy).
      expect(results["GET /sync/"]?.startsWith("404|")).toBe(true);

      // HEAD strips the body that GET returns.
      expect(results["GET vs HEAD /sync"]).toBe("200/4 vs 200/0");
    },
    { timeout: 30_000 },
  );

  test("Allow header is sorted and deduplicated (unit)", () => {
    // Rebuild via compiled fetch to assert determinism without a server.
    const app = new App();
    app.post("/x", () => new Response("p"));
    app.get("/x", () => new Response("g"));
    app.delete("/x", () => new Response("d"));
    const compiled = app.compile();
    const res = compiled.fetch(
      new Request("http://t/x", { method: "OPTIONS" }),
    ) as Response;
    expect(res.headers.get("allow")).toBe("DELETE, GET, HEAD, OPTIONS, POST");
  });
});
