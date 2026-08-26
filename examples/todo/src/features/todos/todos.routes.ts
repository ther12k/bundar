/**
 * Todos feature routes (BR-036): HTTP/HTMX orchestration ONLY. One handler
 * set serves every browser mode: ordinary requests get full documents and
 * Post/Redirect/Get; enhanced (htmx) requests get fragments plus
 * out-of-band region updates via NORMALIZED update intents. Mutations ride
 * the session-bound synchronizer CSRF posture composed by the app shell.
 */
import { jsx } from "@bundar/jsx";
import type { App, Context } from "@bundar/core";
import {
  action,
  actionResponse,
  composeFragment,
  errorViewResponse,
  runFormAction,
  view,
  type HtmxDialectAdapter,
} from "@bundar/htmx";
import {
  addFlash,
  consumeFlash,
  csrfMiddleware,
  issuePageCsrfToken,
  readCsrfTokenFromRequest,
  withCsrfCookie,
} from "@bundar/security";
import type { CsrfSecret } from "@bundar/security";
import { Layout } from "../../layout";
import { urls } from "../../routes.gen";
import type { UpdateSpec } from "@bundar/htmx";
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

export function registerTodoRoutes(app: App, deps: TodoRouteDeps): void {
  const { repository, csrfSecret } = deps;
  const dialectOptions = { dialect: deps.dialect };

  /** Enhanced mutation fragment: item swap PLUS counts OOB intent. */
  const enhancedFragment = (
    primary: unknown,
    counts: TodoCounts,
    removeItemId?: number,
  ) =>
    composeFragment(
      {
        primary,
        updates: [
          {
            target: "todo-counts",
            content: countsRegion(
              counts,
              "all",
            ) as import("@bundar/jsx").JSXChild,
          },
          ...(removeItemId !== undefined
            ? [
                {
                  target: `todo-${removeItemId}`,
                  operation: "remove",
                } satisfies UpdateSpec,
              ]
            : []),
        ],
      },
      { dialect: deps.dialect },
    );

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
              redirectTo: urls["todo-list"](),
            },
            renderForm: (render) =>
              todoForm({
                token: readCsrfTokenFromRequest(context.request),
                title: (render.submitted["title"] as string | undefined) ?? "",
                error: render.errors.first[0]?.message ?? "",
              }),
            formTarget: "#todo-form",
            renderInvalidDocument: (render) =>
              Layout({
                title: "Todos",
                flash: [],
                children: [
                  countsRegion(
                    repository.counts(),
                    "all",
                  ) as import("@bundar/jsx").JSXChild,
                  filterLinks("all") as import("@bundar/jsx").JSXChild,
                  jsx("ul", {
                    id: "todo-list",
                    children: repository.list("all").map((item) =>
                      todoItem({
                        item,
                        token: readCsrfTokenFromRequest(context.request),
                      }),
                    ),
                  }),
                  todoForm({
                    token: readCsrfTokenFromRequest(context.request),
                    title:
                      (render.submitted["title"] as string | undefined) ?? "",
                    error: render.errors.first[0]?.message ?? "",
                  }) as import("@bundar/jsx").JSXChild,
                ],
              }),
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
            redirectTo: urls["todo-list"](),
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
              redirectTo: urls["todo-list"](),
            },
            renderForm: (render) =>
              todoForm({
                token: readCsrfTokenFromRequest(context.request),
                title: (render.submitted["title"] as string | undefined) ?? "",
                error: render.errors.first[0]?.message ?? "",
              }),
            formTarget: "#todo-form",
            renderInvalidDocument: (render) =>
              Layout({
                title: "Todos",
                flash: [],
                children: [
                  countsRegion(
                    repository.counts(),
                    "all",
                  ) as import("@bundar/jsx").JSXChild,
                  filterLinks("all") as import("@bundar/jsx").JSXChild,
                  jsx("ul", {
                    id: "todo-list",
                    children: repository.list("all").map((item) =>
                      todoItem({
                        item,
                        token: readCsrfTokenFromRequest(context.request),
                      }),
                    ),
                  }),
                  todoForm({
                    token: readCsrfTokenFromRequest(context.request),
                    title:
                      (render.submitted["title"] as string | undefined) ?? "",
                    error: render.errors.first[0]?.message ?? "",
                  }) as import("@bundar/jsx").JSXChild,
                ],
              }),
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
            redirectTo: urls["todo-list"](),
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
      const token = await issuePageCsrfToken(csrfSecret, context);
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
      return withCsrfCookie(response, token, { replaceSameName: true });
    },
    { name: "todo-list" },
  );
}
