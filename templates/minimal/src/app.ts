/**
 * The smallest coherent Bundar application: a home route, a health
 * response, and one progressively enhanced form with real validation —
 * the same handlers serve ordinary browsers (Post/Redirect/Get) and htmx
 * submissions (fragments). Typed URLs come from src/routes.gen.ts
 * (regenerate with `bun run routes:check` failing loudly on drift).
 */
import { App, text } from "@bundar/core";
import { jsx } from "@bundar/jsx";
import { createHtmxAssetHandler, runFormAction, view } from "@bundar/htmx";
import { Layout } from "./layout";
import { dialect } from "./dialect";
import { urls } from "./routes.gen";

export function createApp(): App {
  const app = new App();
  const assets = createHtmxAssetHandler({ dialect });

  // Local htmx asset served from the framework's pinned vendor file.
  app.get("/assets/htmx.js", (context) => assets(context.request), {
    name: "asset-htmx",
  });

  app.get(
    "/healthz",
    () => text("ok", { headers: { "cache-control": "no-store" } }),
    {
      name: "health",
    },
  );

  app.get(
    "/",
    (context) =>
      view(
        context.request,
        {
          fragment: () =>
            jsx("section", { id: "home", children: homeContent() }),
          layout: (content) => Layout({ title: "Home", children: content }),
        },
        { dialect },
      ),
    { name: "home" },
  );

  // Progressive form: validation identical for both worlds (GH-060).
  app.post(
    "/subscribe",
    (context) =>
      runFormAction(
        context,
        {
          schema: {
            "~standard": {
              version: 1,
              vendor: "bundar.starter",
              validate: (value: unknown) => {
                const record = value as Record<string, unknown>;
                const email =
                  typeof record["email"] === "string" ? record["email"] : "";
                if (email.trim().length < 3 || !email.includes("@")) {
                  return {
                    issues: [
                      {
                        message: "Enter a valid email address",
                        path: ["email"],
                      },
                    ],
                  };
                }
                return { value: { email: email.trim().toLowerCase() } };
              },
            },
          },
          action: {
            fragment: (output: { email: string }) =>
              jsx("p", {
                id: "subscribed",
                children: "Subscribed: " + output.email,
              }),
            // typed URL — renaming the route fails routes:check, not at runtime
            redirectTo: urls.home(),
          },
          renderForm: (render) =>
            jsx("form", {
              id: "subscribe-form",
              method: "post",
              action: urls.subscribe(),
              "hx-post": urls.subscribe(),
              "hx-target": "#subscribe-form",
              children: [
                jsx("input", {
                  type: "email",
                  name: "email",
                  placeholder: "you@example.com",
                  value:
                    (render.submitted["email"] as string | undefined) ?? "",
                }),
                // the error region inside the form: field messages land here
                jsx("p", {
                  id: "email-error",
                  role: "alert",
                  children: render.errors.first[0]?.message ?? "",
                }),
                jsx("button", { type: "submit", children: "Subscribe" }),
              ],
            }),
          formTarget: "#subscribe-form",
        },
        { dialect },
      ).then((outcome) => outcome.response),
    { name: "subscribe" },
  );

  return app;
}

function homeContent(): unknown {
  return [
    jsx("h1", { children: "Bundar starter" }),
    jsx("p", {
      children:
        "Server JSX + htmx, one set of handlers for every browser mode.",
    }),
    jsx("form", {
      id: "subscribe-form",
      method: "post",
      action: urls.subscribe(),
      "hx-post": urls.subscribe(),
      "hx-target": "#subscribe-form",
      children: [
        jsx("input", {
          type: "email",
          name: "email",
          placeholder: "you@example.com",
        }),
        jsx("p", { id: "email-error", role: "alert", children: "" }),
        jsx("button", { type: "submit", children: "Subscribe" }),
      ],
    }),
  ];
}

export default createApp();
