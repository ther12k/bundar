/** Runnable snippet: one validated form action for both worlds (GH-183 facade). */
import { App } from "@bundar/core";
import { createFormActions, defineFormAction } from "@bundar/htmx";
import { htmx2 } from "@bundar/htmx/2";
import type { StandardSchema } from "@bundar/schema";
import { createTestClient } from "@bundar/testing";

const app = new App();
const forms = createFormActions({ dialect: htmx2 });

const titleSchema: StandardSchema<unknown, { title: string }> = {
  "~standard": {
    version: 1,
    vendor: "snippet",
    validate: (value: unknown) => {
      const title = (value as Record<string, unknown>)["title"];
      return typeof title === "string" && title.trim().length >= 2
        ? { value: { title: title.trim() } }
        : { issues: [{ message: "too short", path: ["title"] }] };
    },
  },
};

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
app.post("/feedback", forms.handle(subscribe));

const client = createTestClient(app, { dialect: htmx2 });
const invalid = await client.submitForm("/feedback", { title: "x" });
if (invalid.status !== 422) throw new Error("snippet forms: expected 422");
const enhanced = await client.enhancedSubmitForm("/feedback", { title: "x" });
if (enhanced.status !== 422)
  throw new Error("snippet forms: expected 422 enhanced");
const valid = await client.submitForm("/feedback", { title: "Good" });
if (valid.status !== 303) throw new Error("snippet forms: expected PRG 303");
