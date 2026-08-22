/** Guide snippet: getting-started §3 (negotiated view) — CI-run. */
import { view } from "@bundar/htmx";
import { jsx, document } from "@bundar/jsx";
import type { App } from "@bundar/core";

export function register(app: App): void {
  app.get("/items", (context) =>
    view(context.request, {
      fragment: () => jsx("ul", { id: "items", children: "fragment" }),
      layout: (content) =>
        document({
          lang: "en",
          title: "Items",
          children: jsx("main", { children: content }),
        }),
    }),
  );
}
