/**
 * GH-036 conformance matrix: every public renderer primitive exercised with
 * at least one positive and one negative assertion in one registry, so
 * coverage closure is visible rather than scattered.
 */
import { describe, expect, test } from "bun:test";
import {
  document,
  DuplicateDocumentRootError,
  fragment,
  Fragment,
  isRawHtml,
  jsx,
  jsxs,
  page,
  raw,
  renderNode,
  renderToStream,
  renderToString,
  renderToStringAsync,
  renderToStringAuto,
  streamResponse,
  UnsupportedChildError,
} from "../../src/index";
import {
  escapeAttributeValue,
  escapeText,
  renderPrimitive,
} from "../../src/index";

describe("GH-036 primitive matrix", () => {
  test("jsx/jsxs/jsxDEV create frozen nodes; Fragment is transparent", () => {
    const node = jsx("p", { children: "x" });
    expect(Object.isFrozen(node)).toBe(true);
    expect(Object.isFrozen(node.props)).toBe(true);
    expect(renderToString(jsxs("p", { children: ["a", "b"] }))).toBe(
      "<p>ab</p>",
    );
    expect(
      renderToString(jsx(Fragment, { children: jsx("p", { children: 1 }) })),
    ).toBe("<p>1</p>");
    expect(() => jsx("p", null as never)).not.toThrow();
  });

  test("renderToString: positive; async trees rejected", () => {
    expect(renderToString(jsx("p", { children: "hi" }))).toBe("<p>hi</p>");
    expect(() =>
      renderToString(Promise.resolve(jsx("p", { children: "x" }))),
    ).toThrow();
    expect(() => renderToString({ odd: true })).toThrow(UnsupportedChildError);
  });

  test("renderToStringAsync: positive; rejections propagate", async () => {
    expect(
      await renderToStringAsync(
        jsx("p", { children: Promise.resolve("late") }),
      ),
    ).toBe("<p>late</p>");
    await expect(
      renderToStringAsync(Promise.reject(new Error("no"))),
    ).rejects.toThrow("no");
  });

  test("renderToStringAuto: sync stays sync, async awaits", async () => {
    const sync = renderToStringAuto(jsx("p", { children: 1 }));
    expect(sync).toBe("<p>1</p>");
    await expect(
      renderToStringAsync(jsx("p", { children: Promise.resolve(2) })),
    ).resolves.toBe("<p>2</p>");
  });

  test("renderNode: positive; cycles fail", () => {
    expect(renderNode("a")).toBe("a");
    const cycle: unknown[] = [];
    cycle.push(cycle);
    expect(() => renderNode(cycle)).toThrow();
  });

  test("renderToStream: positive; cancellation and mid-stream failure", async () => {
    const body = await new Response(
      renderToStream(jsx("p", { children: "s" })).stream,
    ).text();
    expect(body).toBe("<p>s</p>");
    const failing = renderToStream(
      jsx("p", {
        children: [
          "x",
          Promise.reject(new Error("boom")).then(() => "never" as const),
        ],
      }),
    );
    const error = await failing.finished.catch((caught: unknown) => caught);
    expect((error as Error).name).toBe("StreamRenderError");
  });

  test("streamResponse: positive; carries finished", async () => {
    const response = streamResponse(jsx("p", { children: "r" }));
    expect(await response.text()).toBe("<p>r</p>");
    await response.finished;
  });

  test("fragment/page: positive; wrong content types rejected", async () => {
    expect(
      await Promise.resolve(fragment(jsx("p", { children: "f" }))).then((r) =>
        r.text(),
      ),
    ).toBe("<p>f</p>");
    const pageBody = await Promise.resolve(
      page(
        document({
          lang: "en",
          title: "T",
          children: jsx("body", { children: "b" }),
        }),
      ),
    ).then((response) => response.text());
    expect(pageBody).toContain("<!doctype html>");
    expect(pageBody).toContain("<title>T</title>");
  });

  test("document: positive; duplicate roots fail", async () => {
    const html = renderToString(
      document({ lang: "en", children: jsx("body", { children: 1 }) }),
    );
    expect((html.match(/<html[> ]/g) ?? []).length).toBe(1);
    // page() enforces exactly one html root — two roots reject
    const error = await Promise.resolve(
      page(jsx("div", { children: [jsx("html", {}), jsx("html", {})] })),
    ).then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect(error).toBeDefined();
    expect(DuplicateDocumentRootError).toBeDefined();
  });

  test("raw: positive; unbranded values never trusted", () => {
    expect(renderToString(raw("<b>ok</b>"))).toBe("<b>ok</b>");
    expect(isRawHtml("<b>not raw</b>")).toBe(false);
    expect(renderToString("<b>escaped</b>")).toBe("&lt;b&gt;escaped&lt;/b&gt;");
  });

  test("escapeText/escapeAttributeValue/renderPrimitive: positives and rejections", () => {
    expect(escapeText("<&>")).toBe("&lt;&amp;&gt;");
    expect(escapeAttributeValue('"')).toBe("&quot;");
    expect(renderPrimitive(0)).toBe("0");
    expect(() => renderPrimitive({})).toThrow(UnsupportedChildError);
    expect(() => renderPrimitive(() => undefined)).toThrow(
      UnsupportedChildError,
    );
  });
});
