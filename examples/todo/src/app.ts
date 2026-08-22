/**
 * Todo reference application (GH-076).
 *
 * One handler set serves every browser mode: ordinary requests get full
 * documents and Post/Redirect/Get; enhanced (htmx) requests get fragments
 * plus out-of-band region updates via NORMALIZED update intents
 * (serializeUpdates — never hand-written OOB markup). Mutations carry the
 * session-bound synchronizer CSRF posture from the GH-069 workflow
 * contract; authorization is the fixture-wide single-user session.
 *
 * Dialect is injected at construction — zero version conditionals here.
 */
import { App, ErrorBoundary } from "@bundar/core";
import type { Context } from "@bundar/core";
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
import { jsx, page, renderToString } from "@bundar/jsx";
import {
  action,
  actionResponse,
  errorViewResponse,
  runFormAction,
  serializeUpdates,
  view,
  type HtmxDialectAdapter,
  type UpdateIntent,
} from "@bundar/htmx";
import type { JSXChild } from "@bundar/jsx";
import type { TodoCounts, TodoFilter, TodoRepository } from "./domain";
import {
  Layout,
  countsRegion,
  filterLinks,
  todoForm,
  todoItem,
} from "./layout";
import { dialect as defaultDialect } from "./dialect";

export interface CreateTodoAppOptions {
  readonly repository: TodoRepository;
  /** Dialect adapter; defaults to the stable bootstrap choice. */
  readonly dialect?: HtmxDialectAdapter;
  readonly csrfSecret?: CsrfSecret;
}

function parseFilter(value: string | null): TodoFilter {
  return value === "active" || value === "done" ? value : "all";
}

/** The synchronizer token a page form submits (GH-069 composition contract). */
async function pageToken(secret: CsrfSecret, context: Context) {
  const session = getSession(context);
  return issueCsrfToken(secret, session?.id ?? "");
}

function submittedToken(request: Request): string {
  return (
    request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)bundar\.csrf=([^;]*)/)?.[1] ?? ""
  );
}

const titleSchema = {
  "~standard": {
    version: 1 as const,
    vendor: "bundar.todo",
    validate: (value: unknown) => {
      const record = value as Record<string, unknown>;
      const title =
        typeof record["title"] === "string" ? record["title"].trim() : "";
      if (title.length < 2 || title.length > 200) {
        return {
          issues: [
            { message: "Title must be 2–200 characters", path: ["title"] },
          ],
        };
      }
      return { value: { title } };
    },
  },
};

export function createTodoApp(options: CreateTodoAppOptions): {
  app: App;
  repository: TodoRepository;
  start: (port?: number) => ReturnType<typeof Bun.serve>;
} {
  const dialect = options.dialect ?? defaultDialect;
  const repository = options.repository;
  const csrfSecret = options.csrfSecret ?? createCsrfSecret();
  const dialectOptions = { dialect };

  /**
   * Enhanced mutation fragment: primary item element swap PLUS the
   * counts region as a normalized out-of-band intent (replace or remove).
   */
  const enhancedFragment = (
    primary: unknown,
    counts: TodoCounts,
    removeItemId?: number,
  ): string => {
    const primaryHtml = renderToString(primary);
    const intents: UpdateIntent[] = [
      {
        target: { id: "todo-counts" },
        operation: { kind: "replace-element" },
        content: countsRegion(counts, "all") as JSXChild,
      },
    ];
    if (removeItemId !== undefined) {
      intents.push({
        target: { id: `todo-${removeItemId}` },
        operation: { kind: "remove" },
      });
    }
    return primaryHtml + serializeUpdates(intents, dialect).html;
  };

  const app = new App();
  app.use(
    sessionMiddleware({ store: createMemorySessionStore(), secure: false }),
  );

  app.group("", (actions) => {
    actions.use(csrfMiddleware({ secret: csrfSecret }));

    // Create: validated form action; enhanced responses carry the new
    // item AND the counts region as a normalized OOB intent.
    actions.post(
      "/todos",
      (context) =>
        runFormAction(
          context,
          {
            schema: titleSchema,
            action: {
              fragment: (output: { title: string }) => {
                const created = repository.create({ title: output.title });
                addFlash(context, "success", `Added "${created.title}".`);
                return enhancedFragment(
                  todoItem({ item: created, token: "" }),
                  repository.counts(),
                );
              },
              redirectTo: "/",
            },
            renderForm: (render) =>
              todoForm({
                token: submittedToken(context.request),
                title: (render.submitted["title"] as string | undefined) ?? "",
                error: render.errors.first[0]?.message ?? "",
              }),
            formTarget: "#todo-form",
          },
          dialectOptions,
        ).then((outcome) => outcome.response),
      { name: "todo-create" },
    );

    const notFound = (context: Context) =>
      errorViewResponse(
        context.request,
        { status: 404, code: "not_found", message: "Todo not found" },
        {
          renderDocument: (view_) =>
            Layout({
              title: "Not found",
              flash: [],
              children: jsx("h1", { children: view_.message }),
            }),
          renderFragment: (view_) =>
            jsx("p", { id: "todo-error", children: view_.message }),
        },
        dialectOptions,
      );

    actions.post(
      "/todos/:id/toggle",
      (context) => {
        const id = Number(context.params["id"]);
        const toggled = repository.toggle(id);
        if (toggled === undefined) return notFound(context);
        addFlash(
          context,
          "info",
          toggled.done
            ? `Completed "${toggled.title}".`
            : `Reopened "${toggled.title}".`,
        );
        return actionResponse(
          context.request,
          action({
            fragment: enhancedFragment(
              todoItem({ item: toggled, token: "" }),
              repository.counts(),
            ),
            redirectTo: "/",
          }),
          dialectOptions,
        );
      },
      { name: "todo-toggle" },
    );

    actions.post(
      "/todos/:id/edit",
      (context) => {
        const id = Number(context.params["id"]);
        return runFormAction(
          context,
          {
            schema: titleSchema,
            action: {
              fragment: (output: { title: string }) => {
                const renamed = repository.rename(id, output.title);
                if (renamed === undefined) {
                  return jsx("p", {
                    id: "todo-error",
                    children: "Todo not found",
                  });
                }
                addFlash(context, "success", `Renamed to "${renamed.title}".`);
                return enhancedFragment(
                  todoItem({ item: renamed, token: "" }),
                  repository.counts(),
                );
              },
              redirectTo: "/",
            },
            renderForm: (render) =>
              todoForm({
                token: submittedToken(context.request),
                title: (render.submitted["title"] as string | undefined) ?? "",
                error: render.errors.first[0]?.message ?? "",
              }),
            formTarget: "#todo-form",
          },
          dialectOptions,
        ).then((outcome) => outcome.response);
      },
      { name: "todo-edit" },
    );

    actions.post(
      "/todos/:id/delete",
      (context) => {
        const id = Number(context.params["id"]);
        const item = repository.get(id);
        if (item === undefined || !repository.remove(id))
          return notFound(context);
        addFlash(context, "info", `Deleted "${item.title}".`);
        return actionResponse(
          context.request,
          action({
            // primary content: nothing left to swap for a removed row; the
            // counts update and the row removal are both OOB intents
            fragment: enhancedFragment(
              jsx("span", {}),
              repository.counts(),
              id,
            ),
            redirectTo: "/",
          }),
          dialectOptions,
        );
      },
      { name: "todo-delete" },
    );
  });

  // The list page: filters, counts, items, the create form, flash.
  app.get(
    "/",
    async (context) => {
      const url = new URL(context.request.url);
      const filter = parseFilter(url.searchParams.get("filter"));
      const flashes = consumeFlash(context);
      const token = await pageToken(csrfSecret, context);
      const items = repository.list(filter);
      const counts = repository.counts();

      const content = [
        jsx("p", {
          id: "flash",
          children: flashes.map((f) => f.message).join(" "),
        }),
        countsRegion(counts, filter),
        filterLinks(filter),
        jsx("ul", {
          id: "todo-list",
          children: items.map((item) => todoItem({ item, token: token.token })),
        }),
        todoForm({ token: token.token, title: "", error: "" }),
      ];

      const response = await view(
        context.request,
        {
          fragment: () =>
            jsx("section", { id: "todos-region", children: content }),
          layout: (inner) =>
            Layout({ title: "Todos", flash: flashes, children: inner }),
        },
        dialectOptions,
      );
      return withCookie(
        response,
        `bundar.csrf=${token.token}; Path=/; HttpOnly; SameSite=Strict; Expires=${new Date(token.expiresAtMs).toUTCString()}`,
      );
    },
    { name: "todo-list" },
  );

  const boundary = new ErrorBoundary({ development: false });
  const start = (port = 0): ReturnType<typeof Bun.serve> =>
    Bun.serve({
      ...app.compile(),
      port,
      error: (error: Error) => boundary.capture(error),
    });

  return { app, repository, start };
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

export { page };
