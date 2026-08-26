/**
 * Shared Bundar benchmark app (GH-024). Kept free of hono and harness
 * imports so the startup probe can load it in a fresh process and measure
 * App registration + compileRoutes in isolation. Payload constants live
 * in payloads.ts (zero imports) so adapter copies cannot drift.
 */
import {
  App,
  type BunRouteHandler,
  compileRoutes,
  composeMiddleware,
  html as bundarHtml,
  parseForm,
  text as bundarText,
  withHeaders,
  type Middleware,
} from "../../packages/core/src/index";
import { jsx, renderNode, renderNodeAsync } from "../../packages/jsx/src/index";
import {
  FORM_HTML,
  FRAGMENT_HTML,
  INVALID_HTML,
  PAGE_HTML,
  response,
  STATIC_HTML,
} from "./payloads";

export {
  FORM_HTML,
  FRAGMENT_HTML,
  PAGE_HTML,
  response,
  STATIC_HTML,
} from "./payloads";

const PARITY_VARY = "HX-Request";

const benchmarkService = { owner: () => "Bundar" };

const syncPass: Middleware = (context, next) => next(context);
const asyncPass: Middleware = async (context, next) => next(context);

export function buildBundarApp(): {
  serve: (request: Request) => Response | Promise<Response>;
} {
  const app = new App();
  // GH-018 semantics: chains compose once at startup, invoke per request.
  const syncChain = composeMiddleware([syncPass], () =>
    bundarText("sync-middleware"),
  );
  const asyncChain = composeMiddleware([asyncPass], () =>
    bundarText("async-middleware"),
  );

  app.route("/static", ["GET"], response(STATIC_HTML));
  app.get("/dynamic", (context) =>
    bundarText(
      `dynamic:${new URL(context.request.url).searchParams.get("value") ?? ""}`,
    ),
  );
  app.get("/users/:id", (context) =>
    bundarHtml(`<p data-user="${context.params.id}">user</p>`),
  );
  app.get("/middleware/sync", (context) => syncChain(context));
  app.get("/middleware/async", (context) => asyncChain(context));
  app.get("/fragment", () =>
    bundarHtml(
      renderNode(
        jsx("p", { "data-kind": "fragment", children: "<benchmark>" }),
      ),
    ),
  );
  app.get("/async-component", async () =>
    bundarHtml(
      await renderNodeAsync(
        jsx("p", { children: await Promise.resolve("async-component") }),
      ),
    ),
  );
  app.get("/negotiated", (context) => {
    const isFragment = context.request.headers.get(PARITY_VARY) === "true";
    return withHeaders(response(isFragment ? FRAGMENT_HTML : PAGE_HTML), {
      vary: PARITY_VARY,
    });
  });
  app.post("/form", async (context) => {
    const form = await parseForm(context);
    const valid =
      form.get("name") === "Bundar" &&
      form.get("email") === "team@bundar.invalid";
    return response(valid ? FORM_HTML : INVALID_HTML, valid ? 200 : 422);
  });
  app.post("/json", async (context) => {
    const payload = (await context.request.json()) as {
      name?: unknown;
      email?: unknown;
    };
    const valid =
      payload.name === "Bundar" && payload.email === "team@bundar.invalid";
    return response(valid ? FORM_HTML : INVALID_HTML, valid ? 200 : 422);
  });
  app.get("/service", () =>
    bundarHtml(`<p data-service="${benchmarkService.owner()}">service</p>`),
  );

  const { routes } = compileRoutes(app.manifest().routes);
  const serve = (request: Request): Response | Promise<Response> => {
    const path = new URL(request.url).pathname;
    if (path.startsWith("/users/")) {
      const entry = routes["/users/:id"] as Record<string, BunRouteHandler>;
      const handler = entry[request.method] ?? entry["GET"]!;
      const patched = request as Request & { params: Record<string, string> };
      patched.params = { id: path.split("/").pop() ?? "" };
      return handler(patched);
    }
    const entry = routes[path];
    if (entry === undefined) return bundarText("not-found", { status: 404 });
    if (entry instanceof Response) return cloneStatic(entry);
    if (typeof entry === "function") return entry(request as never);
    const methodEntry = entry as Record<string, Response | BunRouteHandler>;
    const handler = methodEntry[request.method];
    if (handler === undefined) return bundarText("not-found", { status: 404 });
    if (handler instanceof Response) return cloneStatic(handler);
    return handler(request as never);
  };
  return { serve };
}

// Bun's native dispatch re-sends a static route's Response for every request
// at the C++ layer; the JS Response body is one-shot, so the in-process
// harness clones to model that per-request re-send without rebuilding it.
function cloneStatic(canonical: Response): Response {
  return canonical.clone() as Response;
}
