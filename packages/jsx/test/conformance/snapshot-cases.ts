/**
 * GH-036 conformance fixtures — the single definition site for the snapshot
 * corpus, shared by the snapshot test and the regeneration tool.
 */
import {
  document,
  jsx,
  Fragment,
  page,
  raw,
  renderToString,
  renderToStringAsync,
  streamResponse,
} from "../../src/index";

export function buildCases(): Record<string, string | Promise<string>> {
  const cases: Record<string, string | Promise<string>> = {};

  cases["elements-void"] = renderToString(
    jsx("input", { type: "text", name: "q", disabled: true }),
  );
  cases["elements-nesting"] = renderToString(
    jsx("section", {
      children: jsx("p", {
        children: [jsx("strong", { children: "hi" }), "!"],
      }),
    }),
  );
  cases["text-escaping"] = renderToString(
    jsx("p", { children: `<b>&"'</b> &amp; café 🎉` }),
  );
  cases["attributes-sorted-escaped"] = renderToString(
    jsx("div", { id: "x", class: "a b", "data-q": 'say "hi"', hidden: false }),
  );
  cases["fragment"] = renderToString(
    jsx(Fragment, {
      children: [jsx("p", { children: 1 }), jsx("p", { children: 2 })],
    }),
  );
  cases["component"] = renderToString(
    jsx(
      (props: Record<string, unknown>) =>
        jsx("p", { children: `hi ${String(props.name)}` }),
      { name: "bundar" },
    ),
  );
  cases["raw-boundary"] = renderToString(
    jsx("div", { children: raw("<em>trusted</em>") }),
  );
  cases["raw-text-script"] = renderToString(
    jsx("script", { children: "if (a<b) f('</script>')" }),
  );
  cases["document"] = renderToString(
    document({
      lang: "en",
      title: "Snap",
      children: jsx("body", { children: "x" }),
    }),
  );
  cases["htmx-attributes"] = renderToString(
    jsx("button", {
      "hx-get": "/items",
      "hx-target": "#list",
      "hx-swap": "outerHTML",
      "hx-trigger": "click delay:100ms",
    }),
  );
  cases["async-tree"] = renderToStringAsync(
    jsx("ul", {
      children: [
        Promise.resolve(jsx("li", { children: "one" })),
        Promise.resolve(jsx("li", { children: "two" })),
      ],
    }),
  );
  cases["page-response"] = Promise.resolve(
    page(
      document({
        lang: "en",
        title: "Page",
        children: jsx("body", { children: "body-text" }),
      }),
    ),
  ).then((response) => response.text());
  cases["stream-response"] = streamResponse(
    jsx("p", { children: Promise.resolve("streamed") }),
  ).text();
  return cases;
}
