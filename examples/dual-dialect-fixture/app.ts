/**
 * Unchanged-source dual-dialect reference application (GH-055).
 *
 * This application code is 100% dialect-agnostic: route handlers and JSX
 * components contain ZERO dialect conditionals (version checks), no
 * dialect-specific branches, and no raw `HX-*` strings. Dialect adapter is
 * injected strictly at bootstrap / configuration time.
 */
import { App } from "@bundar/core";
import { document, jsx, page, raw } from "@bundar/jsx";
import {
  action,
  actionResponse,
  createHtmxAssetHandler,
  errorViewResponse,
  HtmxScript,
  htmxRedirect,
  serializeUpdates,
  validationErrorView,
  view,
  type HtmxDialectAdapter,
} from "@bundar/htmx";

export interface CreateDualAppOptions {
  readonly dialect: HtmxDialectAdapter;
}

export function createDualApp(options: CreateDualAppOptions): App {
  const app = new App();
  const { dialect } = options;

  // 1. Asset serving - delegated to dialect adapter configuration
  const assetHandler = createHtmxAssetHandler({ dialect });
  app.get("/assets/htmx.min.js", (context) => assetHandler(context.request));

  // 2. Landing page with HtmxScript referencing configured dialect asset
  app.get("/", async () => {
    const pageResponse = await Promise.resolve(
      page(
        document({
          lang: "en",
          title: "Dual Dialect Reference Fixture",
          children: [
            HtmxScript({ dialect, integrity: null, crossOrigin: undefined }),
            jsx("h1", { children: "Bundar Dual-Dialect App" }),
            jsx("section", {
              id: "counter-section",
              children: [
                jsx("span", { id: "item-count", children: "0 items" }),
                jsx("button", {
                  id: "add-item-btn",
                  "hx-post": "/items",
                  "hx-target": "#item-list",
                  "hx-swap": "beforeend",
                  children: "Add item",
                }),
              ],
            }),
            jsx("ul", { id: "item-list" }),
            jsx("div", {
              id: "nav-zone",
              children: jsx("button", {
                id: "nav-btn",
                "hx-post": "/navigate",
                children: "Navigate",
              }),
            }),
            jsx("div", {
              id: "error-zone",
              children: jsx("button", {
                id: "error-btn",
                "hx-post": "/trigger-error",
                children: "Trigger error",
              }),
            }),
          ],
        }),
      ),
    );
    return pageResponse;
  });

  // 3. Negotiated view: full document for ordinary browser, fragment for HTMX
  app.get("/items", (context) =>
    view(
      context.request,
      {
        fragment: () =>
          jsx("section", {
            id: "items-box",
            children: jsx("h2", { children: "Items List" }),
          }),
        layout: (content) =>
          document({
            lang: "en",
            title: "Items List",
            children: jsx("body", { children: content }),
          }),
      },
      { dialect },
    ),
  );

  // 4. Progressive action with OOB updates and PRG fallback
  app.post("/items", async (context) => {
    const itemFragment = jsx("li", { class: "item-row", children: "New Item" });
    const { html: oobHtml } = serializeUpdates(
      [
        {
          target: { id: "item-count" },
          operation: { kind: "replace-element" },
          content: jsx("span", { id: "item-count", children: "1 item" }),
        },
      ],
      dialect,
    );

    const composedFragment = [itemFragment, raw(oobHtml)];

    return actionResponse(
      context.request,
      action({
        fragment: composedFragment,
        redirectTo: "/items",
        directives: [{ kind: "trigger", events: [{ name: "item-added" }] }],
      }),
      { dialect },
    );
  });

  // 5. Adaptive navigation helper
  app.post("/navigate", (context) =>
    htmxRedirect(context.request, "/items", {
      baseOrigin: new URL(context.request.url).origin,
    }),
  );

  // 6. Error negotiation
  app.post("/trigger-error", (context) =>
    errorViewResponse(
      context.request,
      validationErrorView(
        {
          order: ["field1"],
          global: [],
          field: () => ["Field is required"],
          first: [{ field: "field1", message: "Field is required" }],
          get empty() {
            return false;
          },
        },
        "Validation Error",
      ),
      {
        renderDocument: (err) =>
          document({
            lang: "en",
            title: "Error",
            children: jsx("body", {
              children: jsx("h1", { children: err.message }),
            }),
          }),
        renderFragment: () =>
          jsx("div", { id: "error-message", children: "Field is required" }),
        fragmentTarget: "#error-zone",
      },
      { dialect },
    ),
  );

  return app;
}
