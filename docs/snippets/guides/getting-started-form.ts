/** Guide snippet: getting-started §4 (validated form action) — CI-run. */
import type { App } from "@bundar/core";
import { createFormActions, defineFormAction } from "@bundar/htmx";
import { htmx2 } from "@bundar/htmx/2";
import type { StandardSchema } from "@bundar/schema";

const titleSchema: StandardSchema<unknown, { title: string }> = {
  "~standard": {
    version: 1,
    vendor: "guide",
    validate: (value: unknown) => {
      const record = value as Record<string, unknown>;
      const title = typeof record["title"] === "string" ? record["title"] : "";
      return title.trim().length >= 2
        ? { value: { title: title.trim() } }
        : { issues: [{ message: "too short", path: ["title"] }] };
    },
  },
};

export function registerForm(app: App): void {
  // bind the dialect once — every form action shares this binding
  const forms = createFormActions({ dialect: htmx2 });

  const subscribe = defineFormAction({
    schema: titleSchema,
    run: ({ title }) => ({ title }), // business execution — may mutate
    success: {
      fragment: (result) => result.title, // rendering only — pure
      redirectTo: "/",
    },
    invalid: {
      fragment: ({ field }) => field("title").error ?? "",
      target: "#form",
    },
  });

  app.post("/subscribe", forms.handle(subscribe));
}
