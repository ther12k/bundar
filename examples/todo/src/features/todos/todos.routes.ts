/**
 * Todos feature routes (BR-036): HTTP/HTMX orchestration ONLY. One handler
 * set serves every browser mode: ordinary requests get full documents and
 * Post/Redirect/Get; enhanced (htmx) requests get fragments plus
 * out-of-band region updates via NORMALIZED update intents. Mutations ride
 * the session-bound synchronizer CSRF posture composed by the app shell.
 *
 * GH-185: create and edit run on the separated form-action facade — the
 * dialect is bound once, `run()` owns repository mutation and flash, the
 * success renderer draws only from the returned domain result, and invalid
 * rendering reads fields through `field(name)`. Toggle and delete keep
 * their direct action composition (they are not validated forms).
 */
import { jsx } from "@bundar/jsx";
import type { App, Context } from "@bundar/core";
import {
  action,
  actionResponse,
  composeFragment,
  createFormActions,
  defineFormAction,
  errorViewResponse,
  view,
  type HtmxDialectAdapter,
  type InvalidFormView,
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
import type { Todo, TodoCounts, TodoRepository } from "./todos.types";

/** Edit outcome: the repository decides; rendering only draws from it. */
type RenameTodoResult =
  | {
      readonly kind: "renamed";
      readonly item: Todo;
      readonly counts: TodoCounts;
    }
  | { readonly kind: "not-found" };

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
  /** The separated facade, dialect bound once for the whole feature. */
  const forms = createFormActions({ dialect: deps.dialect });

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

  /** Field-aware invalid presentation shared by create and edit. */
  const todoInvalid = {
    fragment: (render: InvalidFormView, context: Context) =>
      todoForm({
        token: readCsrfTokenFromRequest(context.request),
        title: render.field("title").value ?? "",
        error: render.field("title").error ?? "",
      }),
    document: (render: InvalidFormView, _view: unknown, context: Context) => {
      const title = render.field("title");
      const token = readCsrfTokenFromRequest(context.request);
      return Layout({
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
                token,
              }),
            ),
          }),
          todoForm({
            token,
            title: title.value ?? "",
            error: title.error ?? "",
          }) as import("@bundar/jsx").JSXChild,
        ],
      });
    },
    target: "#todo-form",
  };

  app.group("", (actions) => {
    actions.use(deps.csrf);

    // Create: validated form action; enhanced responses carry the new
    // item AND the counts region as a normalized OOB intent. run() owns
    // mutation, flash, and post-mutation reads; the renderer is pure.
    const createTodo = defineFormAction({
      schema: titleSchema,
      run: ({ title }, context) => {
        const item = repository.create({ title });
        addFlash(context, "success", `Added "${item.title}".`);
        return { item, counts: repository.counts() };
      },
      success: {
        fragment: ({ item, counts }) =>
          enhancedFragment(todoItem({ item, token: "" }), counts),
        redirectTo: urls["todo-list"](),
      },
      invalid: todoInvalid,
    });

    actions.post("/todos", forms.handle(createTodo), { name: "todo-create" });

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

    // Edit: the not-found decision happens in run() and travels inside the
    // domain result; rendering never mutates.
    const renameTodo = defineFormAction({
      schema: titleSchema,
      run: ({ title }, context): RenameTodoResult => {
        const id = Number(context.params["id"]);
        const renamed = repository.rename(id, title);
        if (renamed === undefined) return { kind: "not-found" };
        addFlash(context, "success", `Renamed to "${renamed.title}".`);
        return { kind: "renamed", item: renamed, counts: repository.counts() };
      },
      success: {
        fragment: (result) => {
          if (result.kind === "not-found") {
            return jsx("p", {
              id: "todo-error",
              children: "Todo not found",
            });
          }
          return enhancedFragment(
            todoItem({ item: result.item, token: "" }),
            result.counts,
          );
        },
        redirectTo: urls["todo-list"](),
      },
      invalid: todoInvalid,
    });

    actions.post("/todos/:id/edit", forms.handle(renameTodo), {
      name: "todo-edit",
    });

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
