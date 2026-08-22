/**
 * Shared Bundar benchmark app (GH-024). Kept free of hono and harness
 * imports so the startup probe can load it in a fresh process and measure
 * App registration + compileRoutes in isolation.
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

export const STATIC_HTML = "<p>static</p>";
export const FRAGMENT_HTML = '<p data-kind="fragment">&lt;benchmark&gt;</p>';
export const PAGE_HTML = "<!doctype html><html><body><p>page</p></body></html>";
export const FORM_HTML = '<p data-valid="true">Bundar</p>';

export function response(
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

const PARITY_VARY = "HX-Request";

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
    return response(
      valid ? FORM_HTML : '<p data-valid="false">invalid</p>',
      valid ? 200 : 422,
    );
  });

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
