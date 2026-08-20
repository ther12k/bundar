import { Hono } from "hono";
import type { Adapter, BenchmarkScenario, ResponseSnapshot } from "./types";

const STATIC_HTML = "<p>static</p>";
const FRAGMENT_HTML = '<p data-kind="fragment">&lt;benchmark&gt;</p>';
const PAGE_HTML = "<!doctype html><html><body><p>page</p></body></html>";
const FORM_HTML = '<p data-valid="true">Bundar</p>';

function response(
  body: string,
  status = 200,
  headers?: Record<string, string>,
  contentType = "text/html; charset=utf-8",
): Response {
  return new Response(body, {
    status,
    headers: { "content-type": contentType, ...headers },
  });
}

function textResponse(body: string, status = 200): Response {
  return response(body, status, undefined, "text/plain; charset=utf-8");
}

async function formBody(request: Request): Promise<Response> {
  const values = new URLSearchParams(await request.text());
  const valid =
    values.get("name") === "Bundar" &&
    values.get("email") === "team@bundar.invalid";
  return response(
    valid ? FORM_HTML : '<p data-valid="false">invalid</p>',
    valid ? 200 : 422,
  );
}

async function rawBunRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  switch (true) {
    case path === "/static":
      return response(STATIC_HTML);
    case path === "/dynamic":
      return textResponse(`dynamic:${url.searchParams.get("value") ?? ""}`);
    case /^\/users\/[^/]+$/.test(path):
      return response(`<p data-user="${path.split("/").pop() ?? ""}">user</p>`);
    case path === "/middleware/sync":
      return textResponse("sync-middleware");
    case path === "/middleware/async":
      await Promise.resolve();
      return textResponse("async-middleware");
    case path === "/fragment":
      return response(FRAGMENT_HTML);
    case path === "/async-component":
      return response(`<p>${await Promise.resolve("async-component")}</p>`);
    case path === "/negotiated":
      return request.headers.get("HX-Request") === "true"
        ? response(FRAGMENT_HTML, 200, { vary: "HX-Request" })
        : response(PAGE_HTML, 200, { vary: "HX-Request" });
    case path === "/form" && request.method === "POST":
      return formBody(request);
    default:
      return textResponse("not-found", 404);
  }
}

function createHonoApp(): Hono {
  const app = new Hono();
  app.get("/static", (c) => c.html(STATIC_HTML));
  app.get("/dynamic", (c) => c.text(`dynamic:${c.req.query("value") ?? ""}`));
  app.get("/users/:id", (c) =>
    c.html(`<p data-user="${c.req.param("id")}">user</p>`),
  );
  app.get("/middleware/sync", (c) => c.text("sync-middleware"));
  app.get("/middleware/async", async (c) => {
    await Promise.resolve();
    return c.text("async-middleware");
  });
  app.get("/fragment", (c) => c.html(FRAGMENT_HTML));
  app.get("/async-component", async (c) =>
    c.html(`<p>${await Promise.resolve("async-component")}</p>`),
  );
  app.get("/negotiated", (c) =>
    c.html(
      c.req.header("HX-Request") === "true" ? FRAGMENT_HTML : PAGE_HTML,
      200,
      {
        Vary: "HX-Request",
      },
    ),
  );
  app.post("/form", async (c) => {
    const values = await c.req.parseBody();
    const valid =
      values.name === "Bundar" && values.email === "team@bundar.invalid";
    return c.html(
      valid ? FORM_HTML : '<p data-valid="false">invalid</p>',
      valid ? 200 : 422,
    );
  });
  return app;
}

const honoApp = createHonoApp();

async function honoRequest(request: Request): Promise<Response> {
  return honoApp.fetch(request);
}

async function bundarRequest(): Promise<Response> {
  return new Response(
    "Bundar implementation is not available before M1/M2; this adapter is intentionally deferred.",
    { status: 501, headers: { "content-type": "text/plain; charset=utf-8" } },
  );
}

export const adapters: readonly Adapter[] = [
  { name: "raw-bun", version: Bun.version, request: rawBunRequest },
  { name: "hono", version: "4.13.3", request: honoRequest },
  { name: "bundar", version: "deferred-until-m1", request: bundarRequest },
];

export async function snapshot(
  responseValue: Response,
): Promise<ResponseSnapshot> {
  const headers: Record<string, string> = {};
  for (const [key, value] of responseValue.headers.entries())
    headers[key] = value;
  return {
    status: responseValue.status,
    headers,
    body: await responseValue.text(),
  };
}

export async function invoke(
  adapter: Adapter,
  scenario: BenchmarkScenario,
): Promise<ResponseSnapshot> {
  return snapshot(await adapter.request(scenario.request(), scenario));
}
