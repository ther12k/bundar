/**
 * Todos feature routes (BR-036): HTTP/HTMX orchestration ONLY. One handler
 * set serves every browser mode: ordinary requests get full documents and
 * Post/Redirect/Get; enhanced (htmx) requests get fragments plus
 * out-of-band region updates via NORMALIZED update intents. Mutations ride
 * the session-bound synchronizer CSRF posture composed by the app shell.
 */
import { jsx, renderToString } from "@bundar/jsx";
import type { JSXChild } from "@bundar/jsx";
import type { App, Context } from "@bundar/core";
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
import {
  addFlash,
  consumeFlash,
  csrfMiddleware,
  getSession,
  issueCsrfToken,
} from "@bundar/security";
import type { CsrfSecret } from "@bundar/security";
import { Layout } from "../../layout";
import { parseFilter, titleSchema } from "./todos.schema";
import { countsRegion, filterLinks, todoForm, todoItem } from "./todos.view";
import type { TodoCounts, TodoRepository } from "./todos.types";

export interface TodoRouteDeps {
  readonly repository: TodoRepository;
  readonly csrfSecret: CsrfSecret;
  readonly dialect: HtmxDialectAdapter;
  /** CSRF middleware composed at the group boundary (GH-069 contract). */
  readonly csrf: ReturnType<typeof csrfMiddleware>;
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

export function registerTodoRoutes(app: App, deps: TodoRouteDeps): void {
  const { repository, csrfSecret } = deps;
  const dialectOptions = { dialect: deps.dialect };

  /** Enhanced mutation fragment: item swap PLUS counts OOB intent. */
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
    return primaryHtml + serializeUpdates(intents, deps.dialect).html;
  };

  const notFound = (context: Context) =>
    errorViewResponse(
      context.request,
      { status: 404, code: "not_found", message: "Todo not found" },
      {
        renderDocument: (errorView) =>
          Layout({
            title: "Not found",
            flash: [],
            children: jsx("h1", { children: errorView.message }),
          }),
        renderFragment: (errorView) =>
          jsx("p", { id: "todo-error", children: errorView.message }),
      },
      dialectOptions,
    );

  app.group("", (actions) => {
    actions.use(deps.csrf);

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
            Layout({
              title: "Todos",
              flash: flashes,
              children: inner as never,
            }),
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
}

function withCookie(response: Response, cookie: string): Response {
  // The page-level session-bound token REPLACES the middleware's anonymous
  // one: two same-name cookies make jar semantics ambiguous for clients.
  const headers = new Headers(response.headers);
  const otherCookies = headers
    .getSetCookie()
    .filter((value) => !value.startsWith("bundar.csrf="));
  const fresh = new Headers();
  headers.forEach((value, key) => {
    if (key !== "set-cookie") fresh.set(key, value);
  });
  for (const value of otherCookies) fresh.append("set-cookie", value);
  fresh.append("set-cookie", cookie);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: fresh,
  });
}
