import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  action,
  actionResponse,
  createHtmxAssetHandler,
  errorViewResponse,
  validationErrorView,
  renderValidationErrorFragment,
  runFormAction,
  serializeUpdates,
  view,
  type FormActionDefinition,
} from "@bundar/htmx";
import { document, jsx, renderToString } from "@bundar/jsx";
import {
  composeMiddleware,
  createContext,
  ErrorBoundary,
  parseForm,
  text,
} from "@bundar/core";
import {
  createCsrfSecret,
  createMemorySessionStore,
  csrfMiddleware,
  getSession,
  issueCsrfToken,
  sessionMiddleware,
} from "@bundar/security";
import { htmx2 } from "@bundar/htmx/2";
import { htmx4Experimental } from "@bundar/htmx/4";

const repositoryRoot = join(import.meta.dir, "..", "..");
const fixtureRoot = join(repositoryRoot, "fixtures", "cross-dialect-app");

export type BrowserLane = "htmx2" | "htmx4";

const versions: Record<BrowserLane, string> = {
  htmx2: "2.0.10",
  htmx4: "4.0.0-beta6",
};

// GH-062 browser session fixture: one in-memory store per server run
// (explicitly unsuitable for production — tests only).
const sessionStore = createMemorySessionStore();
const withSession = sessionMiddleware({
  store: sessionStore,
  secure: false, // fixture serves plain http on 127.0.0.1
});

// GH-061 browser CSRF fixture: one secret per server run; the fixture has
// no session cookie, so tokens bind to the anonymous binding ("").
const csrfSecret = createCsrfSecret();
const csrfProtected = composeMiddleware(
  [csrfMiddleware({ secret: csrfSecret })],
  async (context) =>
    text(`csrf-ok:${(await parseForm(context)).get("name") ?? ""}`),
);

async function csrfFormPage(includeToken: boolean): Promise<Response> {
  const issued = await issueCsrfToken(csrfSecret, "");
  const page = renderToString(
    document({
      lang: "en",
      title: "CSRF fixture",
      children: jsx("body", {
        children: [
          jsx("form", {
            id: "csrf-form",
            method: "post",
            action: "/csrf-protected",
            children: [
              jsx("label", {
                children: [
                  "Name ",
                  jsx("input", { name: "name", value: "Bundar" }),
                ],
              }),
              ...(includeToken
                ? [
                    jsx("input", {
                      type: "hidden",
                      name: "_csrf",
                      value: issued.token,
                      autocomplete: "off",
                    }),
                  ]
                : []),
              jsx("button", { type: "submit", children: "Save" }),
            ],
          }),
          jsx("p", { id: "status", children: "ready" }),
        ],
      }),
    }),
  );
  return new Response(`<!doctype html>${page}`, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "set-cookie": `bundar.csrf=${issued.token}; Path=/; HttpOnly; SameSite=Strict; Expires=${new Date(issued.expiresAtMs).toUTCString()}`,
    },
  });
}

function html(body: string, headers?: Record<string, string>): Response {
  return new Response(body, {
    headers: { "content-type": "text/html; charset=utf-8", ...headers },
  });
}

function fragment(body: string): Response {
  return html(body, { "x-bundar-fixture": "fragment", vary: "HX-Request" });
}

export function fixtureVersion(lane: BrowserLane): string {
  return versions[lane];
}

export async function handler(
  request: Request,
  lane: BrowserLane,
): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/") {
    const source = await readFile(join(fixtureRoot, "index.html"), "utf8");
    return html(source.replace("/assets/htmx.min.js", "/assets/htmx.min.js"));
  }
  if (url.pathname === "/assets/htmx.min.js") {
    const assetHandler = createHtmxAssetHandler({
      dialect: lane === "htmx4" ? htmx4Experimental : htmx2,
    });
    return assetHandler(request);
  }
  if (url.pathname === "/fragment") {
    return fragment('<strong id="fragment">fragment-loaded</strong>');
  }
  if (url.pathname === "/echo" && request.method === "POST") {
    const form = await request.formData();
    return fragment(
      `<strong id="echo">hello-${String(form.get("name") ?? "")}</strong>`,
    );
  }
  if (url.pathname === "/history-target") {
    return fragment('<strong id="history">history-loaded</strong>');
  }
  if (url.pathname === "/page-fragment") {
    // GH-048: one route, two representations, negotiated from normalized
    // metadata — the handler never reads a raw HTMX header.
    return view(request, {
      fragment: () =>
        jsx("section", {
          id: "items",
          children: [
            jsx("h2", { children: "Items" }),
            jsx("p", { children: "42 items available" }),
          ],
        }),
      layout: (content) =>
        document({
          lang: "en",
          title: "Items",
          children: jsx("body", { children: content }),
        }),
    });
  }
  if (url.pathname === "/incorrect-header") {
    return new Response("wrong-header", {
      headers: { "content-type": "text/html", "hx-trigger": "fixture-event" },
    });
  }
  if (url.pathname === "/csrf-form") {
    return csrfFormPage(true);
  }
  if (url.pathname === "/csrf-form-bad") {
    return csrfFormPage(false);
  }
  if (url.pathname === "/csrf-protected" && request.method === "POST") {
    return csrfProtected(createContext(request, {}));
  }
  if (url.pathname === "/action-save" && request.method === "POST") {
    // GH-050: one action result — fragment + trigger for enhanced
    // submissions, PRG redirect for ordinary ones
    return actionResponse(
      request,
      action({
        fragment: jsx("p", { id: "saved", children: "saved-via-action" }),
        redirectTo: "/page-fragment",
        directives: [{ kind: "trigger", events: [{ name: "saved" }] }],
      }),
    );
  }
  if (url.pathname === "/error-validation" && request.method === "POST") {
    // GH-065: a 422 that updates the form region for enhanced requests
    // and renders the full error document for ordinary ones
    return errorViewResponse(
      request,
      validationErrorView({
        order: ["name"],
        global: [],
        field: (name) => (name === "name" ? ["required"] : []),
        first: [{ field: "name", message: "Name is required" }],
        get empty() {
          return false;
        },
      }),
      {
        renderDocument: (errorView) =>
          document({
            lang: "en",
            title: `Error ${errorView.status}`,
            children: jsx("body", {
              children: jsx("h1", { children: errorView.message }),
            }),
          }),
        renderFragment: renderValidationErrorFragment,
        fragmentTarget: "#error-target",
      },
    );
  }
  if (url.pathname === "/error-forbidden") {
    // GH-065: protected failure — document path regardless of enhancement
    return errorViewResponse(
      request,
      { status: 403, code: "forbidden", message: "Access denied" },
      {
        renderDocument: () =>
          document({
            lang: "en",
            title: "Forbidden",
            children: jsx("body", {
              children: jsx("h1", { children: "Access denied" }),
            }),
          }),
        renderFragment: () =>
          jsx("section", { id: "leaked-region", children: "secret-fragment" }),
        fragmentTarget: "#error-target",
      },
    );
  }
  if (url.pathname === "/multi-region" && request.method === "POST") {
    // GH-051: identical intent source for both dialect lanes — the counter
    // element is replaced and a row appends, all out-of-band
    const { html } = serializeUpdates(
      [
        {
          target: { id: "mr-counter" },
          operation: { kind: "replace-element" },
          content: jsx("span", { id: "mr-counter", children: "42 items" }),
        },
        {
          target: { id: "mr-list" },
          operation: { kind: "append" },
          content: jsx("li", { children: "fresh row" }),
        },
      ],
      // dialect parity is asserted in unit tests; the fixture pins one
      lane === "htmx4" ? htmx4Experimental : htmx2,
    );
    return fragment(html);
  }
  if (url.pathname === "/validated-form" && request.method === "POST") {
    // GH-060: one action, identical validation for both worlds
    return runFormAction(createContext(request, {} as Record<string, string>), {
      schema: {
        "~standard": {
          version: 1,
          vendor: "fixture",
          validate: (value) => {
            const record = value as Record<string, unknown>;
            const issues: Array<{ message: string; path: PropertyKey[] }> = [];
            if (typeof record.name !== "string" || record.name.length < 2) {
              issues.push({ message: "Name too short", path: ["name"] });
            }
            return issues.length > 0 ? { issues } : { value: record as never };
          },
        },
      },
      action: {
        fragment: (output: { name: string }) =>
          jsx("p", { id: "welcome", children: `hi ${output.name}` }),
        redirectTo: "/page-fragment",
      },
      renderForm: (render) =>
        jsx("form", {
          id: "register",
          children: [
            jsx("input", {
              name: "name",
              value: (render.submitted.name as string | undefined) ?? "",
            }),
            jsx("p", {
              id: "field-error",
              children: render.errors.first[0]?.message ?? "",
            }),
          ],
        }),
      formTarget: "#register-card",
    } satisfies FormActionDefinition<{ name: string }>).then(
      (outcome) => outcome.response,
    );
  }
  if (url.pathname === "/session-whoami" && request.method === "GET") {
    return composeMiddleware([withSession], (context) =>
      text(String(getSession(context)?.get("user") ?? "anonymous")),
    )(createContext(request, {}));
  }
  if (url.pathname === "/session-login" && request.method === "POST") {
    return composeMiddleware([withSession], async (context) => {
      const form = await parseForm(context);
      const session = getSession(context)!;
      session.set("user", form.get("user") ?? "anonymous");
      session.rotate();
      return text(`logged-in:${String(session.get("user"))}`);
    })(createContext(request, {}));
  }
  if (url.pathname === "/session-logout" && request.method === "POST") {
    return composeMiddleware([withSession], (context) => {
      getSession(context)!.destroy();
      return text("logged-out");
    })(createContext(request, {}));
  }
  if (url.pathname === "/favicon.ico") {
    return new Response(null, { status: 204 });
  }
  return new Response(`not-found:${lane}`, { status: 404 });
}

const boundary = new ErrorBoundary({ development: false });

export async function startFixtureServer(
  lane: BrowserLane,
): Promise<ReturnType<typeof Bun.serve>> {
  return Bun.serve({
    port: 0,
    fetch: (request) => handler(request, lane),
    // thrown HttpErrors (e.g. CsrfError 403) keep their public envelope
    error: (error) => boundary.capture(error),
  });
}
