/** Runnable snippet: one validated form action for both worlds (GH-060). */
import { App } from "@bundar/core";
import { runFormAction } from "@bundar/htmx";
import { createTestClient } from "@bundar/testing";

const app = new App();
app.post("/feedback", (context) =>
  runFormAction(context, {
    schema: {
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
    },
    action: {
      fragment: (output: { title: string }) => output.title,
      redirectTo: "/",
    },
    renderForm: () => "form",
  }).then((outcome) => outcome.response),
);

const client = createTestClient(app);
const invalid = await client.submitForm("/feedback", { title: "x" });
if (invalid.status !== 422) throw new Error("snippet forms: expected 422");
const valid = await client.submitForm("/feedback", { title: "Good" });
if (valid.status !== 303) throw new Error("snippet forms: expected PRG 303");
