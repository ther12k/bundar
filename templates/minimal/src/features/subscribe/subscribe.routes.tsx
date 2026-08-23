/**
 * Subscribe feature routes (BR-029/BR-030): HTTP and hypermedia
 * orchestration ONLY. Parsing, validation, and exactly-once success
 * semantics come from the framework; this module wires them to the
 * feature's schema and views.
 */
import { runFormAction, view } from "@bundar/htmx";
import type { App, Context } from "@bundar/core";
import { dialect } from "../../platform/dialect";
import { Layout } from "../../layout";
import { subscribeSchema } from "./subscribe.schema";
import { SubscribedFragment, SubscribeForm } from "./subscribe.view";
import { urls } from "../../routes.gen";

export function homeHandler(context: Context) {
  return view(
    context.request,
    {
      fragment: () => (
        <section id="home">
          <h1>Bundar starter</h1>
          <p>Server JSX + htmx, one set of handlers for every browser mode.</p>
          {SubscribeForm({})}
        </section>
      ),
      layout: (content) =>
        Layout({ title: "Home", children: content as never }),
    },
    { dialect },
  );
}

export async function subscribeHandler(context: Context): Promise<Response> {
  const outcome = await runFormAction(
    context,
    {
      schema: subscribeSchema,
      action: {
        fragment: (output: { email: string }) =>
          SubscribedFragment({ email: output.email }),
        // typed URL — renaming the route fails routes:check, not at runtime
        redirectTo: urls.home(),
      },
      renderForm: (render) => <SubscribeForm render={render} />,
      formTarget: "#subscribe-form",
    },
    { dialect },
  );
  return outcome.response;
}

export function registerSubscribeRoutes(app: App): void {
  app.get(urls.home(), homeHandler, { name: "home" });
  app.post(urls.subscribe(), subscribeHandler, { name: "subscribe" });
}
