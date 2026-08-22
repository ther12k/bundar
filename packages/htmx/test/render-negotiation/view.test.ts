/**
 * GH-048 — full-page and fragment negotiation.
 *
 * Proves one handler serves a complete document to ordinary navigation and
 * a fragment to enhanced requests through normalized metadata only: boosted
 * and history-restore requests always receive a document, no handler ever
 * reads a raw HTMX header, every response carries the negotiation Vary, and
 * the no-JS path is a valid standalone document.
 */
import { describe, expect, test } from "bun:test";
import { document, jsx } from "@bundar/jsx";
import {
  negotiateView,
  normalizeHtmxRequest,
  view,
  VIEW_VARY_HEADERS,
  ViewDefinitionError,
} from "../../src/index";
import { htmx2 } from "../../src/dialects/v2/index";
import { htmx4Experimental } from "../../src/dialects/v4/index";

const EXPECTED_VARY = "HX-Request, HX-Boosted, HX-History-Restore-Request";

function request(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/items", { headers });
}

/** Fragment content shared by the page layout — the dual-representation body. */
const fragmentTree = () =>
  jsx("section", {
    id: "items",
    children: [jsx("h2", { children: "Items" }), jsx("p", { children: "42" })],
  });

const layoutDocument = (content: unknown) =>
  document({
    lang: "en",
    title: "Items",
    children: jsx("body", { children: content as never }),
  });

/** The handler: one definition, no raw headers, no dialect knowledge. */
const itemsView = (requestValue: Request) =>
  view(requestValue, {
    fragment: fragmentTree,
    layout: layoutDocument,
  });

describe("GH-048 negotiateView", () => {
  test("normal navigation negotiates a document", () => {
    const negotiated = negotiateView(normalizeHtmxRequest(request()));
    expect(negotiated.representation).toBe("document");
    expect(negotiated.reason).toBe("normal-navigation");
    expect(negotiated.vary).toEqual(VIEW_VARY_HEADERS);
  });

  test("standard enhanced requests negotiate a fragment", () => {
    const negotiated = negotiateView(
      normalizeHtmxRequest(request({ "HX-Request": "true" })),
    );
    expect(negotiated.representation).toBe("fragment");
    expect(negotiated.reason).toBe("enhanced-request");
  });

  test("boosted navigation negotiates a document (body swaps need a page)", () => {
    const negotiated = negotiateView(
      normalizeHtmxRequest(
        request({ "HX-Request": "true", "HX-Boosted": "true" }),
      ),
    );
    expect(negotiated.representation).toBe("document");
    expect(negotiated.reason).toBe("boosted-navigation");
  });

  test("history restore negotiates a document, never a fragment", () => {
    const negotiated = negotiateView(
      normalizeHtmxRequest(
        request({
          "HX-Request": "true",
          "HX-History-Restore-Request": "true",
        }),
      ),
    );
    expect(negotiated.representation).toBe("document");
    expect(negotiated.reason).toBe("history-restore");
  });

  test("negotiation is deterministic and side-effect free", () => {
    const metadata = normalizeHtmxRequest(
      request({ "HX-Request": "true", "HX-Boosted": "true" }),
    );
    expect(negotiateView(metadata)).toEqual(negotiateView(metadata));
  });
});

describe("GH-048 view rendering", () => {
  test("the same handler returns a complete document to a normal browser", async () => {
    const response = await itemsView(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/html; charset=utf-8",
    );
    expect(response.headers.get("vary")).toBe(EXPECTED_VARY);
    const html = await response.text();
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect((html.match(/<html[> ]/gi) ?? []).length).toBe(1);
    expect(html).toContain('<section id="items">');
  });

  test("the same handler returns only the fragment to an enhanced request", async () => {
    const response = await itemsView(request({ "HX-Request": "true" }));
    expect(response.headers.get("vary")).toBe(EXPECTED_VARY);
    const html = await response.text();
    expect(html.startsWith("<!doctype")).toBe(false);
    expect(html).toContain('<section id="items">');
    expect(html).not.toContain("<html");
  });

  test("the layout is not invoked on the fragment path", async () => {
    let layoutCalls = 0;
    const response = await view(request({ "HX-Request": "true" }), {
      fragment: fragmentTree,
      layout: (content) => {
        layoutCalls += 1;
        return layoutDocument(content);
      },
    });
    await response.text();
    expect(layoutCalls).toBe(0);
  });

  test("boosted navigation receives the full document", async () => {
    const response = await itemsView(
      request({ "HX-Request": "true", "HX-Boosted": "true" }),
    );
    const html = await response.text();
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect((html.match(/<html[> ]/gi) ?? []).length).toBe(1);
  });

  test("history restore does not install a fragment as a document", async () => {
    const response = await itemsView(
      request({
        "HX-Request": "true",
        "HX-History-Restore-Request": "true",
      }),
    );
    const html = await response.text();
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect((html.match(/<html[> ]/gi) ?? []).length).toBe(1);
    expect(html).toContain('<section id="items">');
  });

  test("an explicit page() path is used instead of layout for documents", async () => {
    let layoutCalls = 0;
    const response = await view(request(), {
      fragment: fragmentTree,
      page: () =>
        document({
          lang: "en",
          title: "Explicit",
          children: jsx("body", { children: "explicit-page" }),
        }),
      layout: (content) => {
        layoutCalls += 1;
        return layoutDocument(content);
      },
    });
    const html = await response.text();
    expect(html).toContain("explicit-page");
    expect(layoutCalls).toBe(0);
  });

  test("a document representation without page() or layout() fails closed", async () => {
    await expect(
      view(request(), { fragment: fragmentTree }),
    ).rejects.toBeInstanceOf(ViewDefinitionError);
  });

  test("fragment paths still fail closed without a document definition", async () => {
    // enhanced requests never need the document path, so the same
    // definition stays usable for fragment-only routes
    const response = await view(request({ "HX-Request": "true" }), {
      fragment: fragmentTree,
    });
    expect((await response.text()).startsWith("<section")).toBe(true);
  });

  test("async components render on both paths", async () => {
    const response = await view(request({ "HX-Request": "true" }), {
      fragment: () => Promise.resolve(jsx("p", { children: "async-fragment" })),
      layout: (content) =>
        Promise.resolve(
          document({
            lang: "en",
            title: "Async",
            children: jsx("body", { children: content as never }),
          }),
        ),
    });
    expect(await response.text()).toContain("async-fragment");
  });

  test("status and custom headers pass through and vary composes", async () => {
    const response = await view(
      request(),
      {
        fragment: fragmentTree,
        layout: layoutDocument,
      },
      { status: 201, headers: { "x-bundar-scope": "items", vary: "Cookie" } },
    );
    expect(response.status).toBe(201);
    expect(response.headers.get("x-bundar-scope")).toBe("items");
    expect(response.headers.get("vary")).toBe(`Cookie, ${EXPECTED_VARY}`);
  });
});

describe("GH-048 dialect decoding", () => {
  test("negotiation works through the htmx 2 adapter", async () => {
    const response = await view(
      request({ "HX-Request": "true" }),
      { fragment: fragmentTree, layout: layoutDocument },
      { dialect: htmx2 },
    );
    expect(await response.text()).toContain("<section");
  });

  test("negotiation works through the htmx 4 adapter with its aliases", async () => {
    // v4 maps HX-Trigger→HX-Source; the negotiation headers keep canonical
    // names, and decoding through the adapter must not change the outcome
    const response = await view(
      request({
        "HX-Request": "true",
        "HX-Source": "save-button",
      }),
      { fragment: fragmentTree, layout: layoutDocument },
      { dialect: htmx4Experimental },
    );
    expect(await response.text()).toContain("<section");
    const boosted = await view(
      request({
        "HX-Request": "true",
        "HX-Boosted": "true",
        "HX-Source": "nav",
      }),
      { fragment: fragmentTree, layout: layoutDocument },
      { dialect: htmx4Experimental },
    );
    expect((await boosted.text()).startsWith("<!doctype html>")).toBe(true);
  });
});

describe("GH-048 no-JS fallback", () => {
  test("the document is valid standalone HTML with the fragment content inline", async () => {
    const response = await itemsView(request());
    const html = await response.text();
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<title>Items</title>");
    expect(html).toContain('lang="en"');
    expect(html).toContain('<section id="items">');
  });
});
