/** Guide snippet: getting-started §4 (validated form action) — CI-run. */
import type { App } from "@bundar/core";
import { runFormAction } from "@bundar/htmx";

const titleSchema = {
  "~standard": {
    version: 1 as const,
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
  app.post("/subscribe", (context) =>
    runFormAction(context, {
      schema: titleSchema,
      action: {
        fragment: (out: { title: string }) => out.title,
        redirectTo: "/",
      },
      renderForm: () => "",
    }).then((outcome) => outcome.response),
  );
}
