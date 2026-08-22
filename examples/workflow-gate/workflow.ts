/**
 * Reference authenticated progressive workflow (GH-069).
 *
 * A representative create/delete workflow composing every M4 security
 * primitive behind ordinary route handlers: sessions (GH-062), CSRF
 * (GH-061), Standard Schema validation through `runFormAction` (GH-058,
 * GH-060), flash messages (GH-063), view negotiation (GH-048), action
 * composition (GH-050), and error negotiation (GH-065).
 *
 * Two composition rules this app demonstrates:
 *
 * 1. Authorization is server-side only — `requireUser` checks the session,
 *    never HTMX metadata. An enhanced request gains no privileges.
 * 2. CSRF middleware is scoped to the ACTION routes. Page renderers issue
 *    the synchronizer token themselves, bound to the session identity the
 *    NEXT request will present (`session.id`), because a token issued
 *    before the first session cookie exists would bind to the anonymous
 *    binding and fail verification forever. Scoping verification to unsafe
 *    methods keeps issuance and verification consistent.
 *
 * The same handler source serves ordinary browsers (PRG fallback) and
 * enhanced HTMX submissions (fragments) — negotiation is per request.
 */
import { App, ErrorBoundary } from "@bundar/core";
import {
  addFlash,
  consumeFlash,
  createCsrfSecret,
  createMemorySessionStore,
  csrfMiddleware,
  getSession,
  issueCsrfToken,
  sessionMiddleware,
  type CsrfSecret,
} from "@bundar/security";
import { document, jsx, page } from "@bundar/jsx";
import {
  action,
  actionResponse,
  errorViewResponse,
  runFormAction,
  view,
  type HtmxDialectAdapter,
} from "@bundar/htmx";

export interface CreateWorkflowAppOptions {
  /** Dialect adapter for response composition; neutral when omitted. */
  readonly dialect?: HtmxDialectAdapter;
  /** Error-boundary environment; defaults to production posture (opaque 500s). */
  readonly development?: boolean;
}

interface WorkflowItem {
  readonly id: number;
  title: string;
}

/** Server-side authorization: session state only, never HTMX metadata. */
function requireUser(context: Parameters<typeof getSession>[0]) {
  const session = getSession(context);
  if (session === undefined) return null;
  return (session.get("user") as string | undefined) ?? null;
}

/**
 * Issues the synchronizer token a page form will submit: bound to the
 * session identity the browser presents on its next request, set BOTH as
 * the `bundar.csrf` cookie and the hidden `_csrf` field (double submit).
 */
async function pageToken(
  secret: CsrfSecret,
  context: Parameters<typeof getSession>[0],
) {
  const session = getSession(context);
  const binding = session?.id ?? "";
  return issueCsrfToken(secret, binding);
}

function withCookie(response: Response, cookie: string): Response {
  const headers = new Headers(response.headers);
  headers.append("set-cookie", cookie);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function csrfCookie(token: string, expiresAtMs: number): string {
  return `bundar.csrf=${token}; Path=/; HttpOnly; SameSite=Strict; Expires=${new Date(expiresAtMs).toUTCString()}`;
}

/**
 * The token this request submitted (the `bundar.csrf` cookie — the
 * middleware enforces cookie/submitted equality). Re-rendered forms embed
 * it again: a 422 response does not rotate the token, so the retry
 * verifies without a form re-fetch.
 */
function submittedToken(request: Request): string {
  return (
    request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)bundar\.csrf=([^;]*)/)?.[1] ?? ""
  );
}

export function createWorkflowApp(options: CreateWorkflowAppOptions = {}): {
  app: App;
  items: ReadonlyMap<number, WorkflowItem>;
  /** Serves the app with the application error boundary wired (GH-020). */
  start: (port?: number) => ReturnType<typeof Bun.serve>;
} {
  const { dialect } = options;
  const app = new App();
  const boundary = new ErrorBoundary({
    ...(options.development === undefined
      ? { development: false }
      : { development: options.development }),
  });
  const start = (port = 0): ReturnType<typeof Bun.serve> =>
    Bun.serve({
      ...app.compile(),
      port,
      // The application boundary — not Bun's default opaque 500 —
      // classifies every thrown failure (GH-020, GH-067).
      error: (error: Error) => boundary.capture(error),
    });
  const sessionStore = createMemorySessionStore();
  const csrfSecret = createCsrfSecret();
  const items = new Map<number, WorkflowItem>();
  let nextId = 1;
  const dialectOptions = dialect === undefined ? {} : { dialect };

  app.use(
    sessionMiddleware({
      store: sessionStore,
      secure: false, // local/test environment only
    }),
  );

  // Actions: CSRF verification scoped to unsafe methods. Registration in
  // this group stamps the CSRF middleware onto these routes only.
  app.group("", (actions) => {
    actions.use(csrfMiddleware({ secret: csrfSecret }));

    // Login: validated form action; on success, establish the session.
    actions.post("/login", async (context) => {
      const outcome = await runFormAction(
        context,
        {
          schema: {
            "~standard": {
              version: 1,
              vendor: "bundar.workflow",
              validate: (value: unknown) => {
                const record = value as Record<string, unknown>;
                const user = record["user"];
                if (typeof user !== "string" || user.trim().length < 2) {
                  return {
                    issues: [
                      {
                        message: "Username must be at least 2 characters",
                        path: ["user"],
                      },
                    ],
                  };
                }
                return { value: { user: user.trim() } };
              },
            },
          },
          action: {
            fragment: (output: { user: string }) => {
              getSession(context)?.set("user", output.user);
              addFlash(context, "success", `Welcome, ${output.user}.`);
              return jsx("p", {
                id: "login-result",
                children: `Welcome, ${output.user}.`,
              });
            },
            redirectTo: "/items",
          },
          renderForm: (render) =>
            jsx("form", {
              id: "login-form",
              method: "post",
              action: "/login",
              children: [
                jsx("input", {
                  type: "hidden",
                  name: "_csrf",
                  value: submittedToken(context.request),
                }),
                jsx("input", {
                  name: "user",
                  value: (render.submitted["user"] as string | undefined) ?? "",
                  autocomplete: "username",
                }),
                jsx("p", {
                  id: "login-errors",
                  children: render.errors.first[0]?.message ?? "",
                }),
                jsx("button", { type: "submit", children: "Sign in" }),
              ],
            }),
          formTarget: "#login-form",
        },
        dialectOptions,
      );
      return outcome.response;
    });

    // Create: session-authorized validated form action.
    actions.post("/items", async (context) => {
      if (requireUser(context) === null) {
        return unauthorizedResponse(context.request, dialectOptions);
      }
      const outcome = await runFormAction(
        context,
        {
          schema: {
            "~standard": {
              version: 1,
              vendor: "bundar.workflow",
              validate: (value: unknown) => {
                const record = value as Record<string, unknown>;
                const title = record["title"];
                if (typeof title !== "string" || title.trim().length < 2) {
                  return {
                    issues: [
                      {
                        message: "Title must be at least 2 characters",
                        path: ["title"],
                      },
                    ],
                  };
                }
                return { value: { title: title.trim() } };
              },
            },
          },
          action: {
            fragment: (output: { title: string }) => {
              const item: WorkflowItem = { id: nextId++, title: output.title };
              items.set(item.id, item);
              addFlash(context, "success", `Created “${item.title}”.`);
              return jsx("li", {
                "data-item-id": String(item.id),
                children: item.title,
              });
            },
            redirectTo: "/items",
          },
          renderForm: (render) =>
            jsx("form", {
              id: "item-form",
              method: "post",
              action: "/items",
              children: [
                jsx("input", {
                  type: "hidden",
                  name: "_csrf",
                  value: submittedToken(context.request),
                }),
                jsx("input", {
                  name: "title",
                  value:
                    (render.submitted["title"] as string | undefined) ?? "",
                  placeholder: "New item",
                }),
                jsx("p", {
                  id: "item-errors",
                  children: render.errors.first[0]?.message ?? "",
                }),
                jsx("button", { type: "submit", children: "Add" }),
              ],
            }),
          formTarget: "#item-form",
        },
        dialectOptions,
      );
      return outcome.response;
    });

    // Delete: session-authorized action with flash.
    actions.post("/items/:id/delete", async (context) => {
      if (requireUser(context) === null) {
        return unauthorizedResponse(context.request, dialectOptions);
      }
      const id = Number(context.params["id"]);
      const item = items.get(Number.isInteger(id) ? id : NaN);
      if (item === undefined) {
        return errorViewResponse(
          context.request,
          { status: 404, code: "not_found", message: "Item not found" },
          {
            renderDocument: (view) =>
              document({
                lang: "en",
                title: "Not found",
                children: jsx("h1", { children: view.message }),
              }),
            renderFragment: (view) =>
              jsx("p", { id: "not-found", children: view.message }),
          },
          dialectOptions,
        );
      }
      items.delete(item.id);
      addFlash(context, "info", `Deleted “${item.title}”.`);
      return actionResponse(
        context.request,
        action({
          fragment: jsx("p", {
            id: "deleted",
            children: `Deleted item ${item.id}`,
          }),
          redirectTo: "/items",
        }),
        dialectOptions,
      );
    });
  });

  // Login page: issues the first session cookie and the bound CSRF token.
  app.get("/login", async (context) => {
    if (requireUser(context) !== null) {
      return new Response(null, {
        status: 303,
        headers: { location: "/items" },
      });
    }
    const token = await pageToken(csrfSecret, context);
    const response = await page(
      document({
        lang: "en",
        title: "Sign in",
        children: [
          jsx("h1", { children: "Sign in" }),
          jsx("form", {
            id: "login-form",
            method: "post",
            action: "/login",
            children: [
              jsx("input", {
                type: "hidden",
                name: "_csrf",
                value: token.token,
              }),
              jsx("input", { name: "user", autocomplete: "username" }),
              jsx("button", { type: "submit", children: "Sign in" }),
            ],
          }),
        ],
      }),
    );
    return withCookie(response, csrfCookie(token.token, token.expiresAtMs));
  });

  // Items page: authorized list + create form; consumes flash messages.
  app.get("/items", async (context) => {
    const user = requireUser(context);
    if (user === null) {
      return unauthorizedResponse(context.request, dialectOptions);
    }
    const flashes = consumeFlash(context);
    const token = await pageToken(csrfSecret, context);

    const listContent = [
      jsx("ul", {
        id: "item-list",
        children: [...items.values()].map((item) =>
          jsx("li", {
            key: String(item.id),
            "data-item-id": String(item.id),
            children: [
              item.title,
              " ",
              jsx("button", {
                "hx-post": `/items/${item.id}/delete`,
                "hx-confirm": "Delete this item?",
                children: "Delete",
              }),
            ],
          }),
        ),
      }),
      jsx("form", {
        id: "item-form",
        method: "post",
        action: "/items",
        children: [
          jsx("input", { type: "hidden", name: "_csrf", value: token.token }),
          jsx("input", { name: "title", placeholder: "New item" }),
          jsx("button", { type: "submit", children: "Add" }),
        ],
      }),
    ];

    const response = await view(
      context.request,
      {
        fragment: () =>
          jsx("section", { id: "items-region", children: listContent }),
        layout: (content) =>
          document({
            lang: "en",
            title: "Items",
            children: [
              jsx("p", {
                id: "flash",
                children: flashes.map((f) => f.message).join(" "),
              }),
              jsx("p", { id: "whoami", children: `Signed in as ${user}` }),
              jsx("main", { id: "view-content", children: content }),
            ],
          }),
      },
      dialectOptions,
    );
    return withCookie(response, csrfCookie(token.token, token.expiresAtMs));
  });

  /**
   * 401 presentation: a generic document (login link, no protected
   * content) for BOTH ordinary and enhanced requests — the GH-065 default
   * for authorization failures.
   */
  function unauthorizedResponse(
    request: Request,
    dialectOpts: { dialect?: HtmxDialectAdapter },
  ): Promise<Response> {
    return Promise.resolve(
      errorViewResponse(
        request,
        { status: 401, code: "unauthorized", message: "Sign in required" },
        {
          renderDocument: () =>
            document({
              lang: "en",
              title: "Sign in required",
              children: [
                jsx("h1", { children: "Sign in required" }),
                jsx("p", {
                  children: jsx("a", {
                    href: "/login",
                    children: "Go to the login page",
                  }),
                }),
              ],
            }),
        },
        dialectOpts,
      ),
    );
  }

  return { app, items, start };
}
