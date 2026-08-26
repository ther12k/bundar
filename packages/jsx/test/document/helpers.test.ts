import { describe, expect, test } from "bun:test";
import { jsx, jsxs } from "../../src/jsx-runtime";
import { renderNode } from "../../src/render/node";
import {
  DOCTYPE,
  document,
  DuplicateDocumentRootError,
  isRawTextElement,
  isVoidElement,
  renderDocument,
  serializeRawText,
} from "../../src/index";

describe("GH-032 void elements", () => {
  test("void elements never receive closing tags", () => {
    expect(renderNode(jsx("input", { type: "text" }))).toBe(
      `<input type="text">`,
    );
    expect(renderNode(jsx("br", {}))).toBe(`<br>`);
    expect(renderNode(jsx("img", { src: "/x.png", alt: "x" }))).toBe(
      `<img alt="x" src="/x.png">`,
    );
    expect(renderNode(jsx("meta", { charset: "utf-8" }))).toBe(
      `<meta charset="utf-8">`,
    );
    expect(renderNode(jsx("hr", {}))).toBe(`<hr>`);
  });

  test("void element children are ignored, not serialized", () => {
    // children on a void element are invalid HTML; the serializer omits them
    const output = renderNode(jsx("br", { children: "oops" }));
    expect(output).toBe(`<br>`);
    expect(output).not.toContain("oops");
    expect(output).not.toContain(`</br>`);
  });

  test("isVoidElement is case-insensitive", () => {
    expect(isVoidElement("IMG")).toBe(true);
    expect(isVoidElement("div")).toBe(false);
  });
});

describe("GH-032 raw-text elements", () => {
  test("script/style text children are not entity-escaped", () => {
    const script = renderNode(
      jsx("script", { children: "if (a < b && c > d) { run(); }" }),
    );
    expect(script).toBe(`<script>if (a < b && c > d) { run(); }</script>`);
    const style = renderNode(
      jsx("style", { children: "p > em { content: 'x'; }" }),
    );
    expect(style).toBe(`<style>p > em { content: 'x'; }</style>`);
  });

  test("close-tag payloads cannot break out of script or style", () => {
    const hostile = renderNode(
      jsx("script", { children: 'alert("</script><script>evil()")' }),
    );
    expect(hostile).not.toMatch(/<\/script><script>/);
    expect(hostile).toContain(`</script>`); // only the real closing tag

    const cssHostile = renderNode(
      jsx("style", { children: 'body { background: url("</style>x") }' }),
    );
    expect(cssHostile).not.toContain("</style>x");
  });

  test("serializeRawText neutralizes per element grammar", () => {
    expect(serializeRawText("script", "</script>")).toBe("<\\/script>");
    expect(serializeRawText("style", "</style>")).toBe("\\3c /style>");
    expect(isRawTextElement("TEXTAREA")).toBe(true);
  });
});

describe("GH-032 document structure", () => {
  test("renderDocument output begins with the approved doctype", () => {
    const tree = document({
      lang: "en",
      title: "Home",
      children: jsx("p", { children: "hi" }),
    });
    const html = renderDocument(tree, renderNode);
    expect(html.startsWith(DOCTYPE)).toBe(true);
    expect(DOCTYPE).toBe("<!doctype html>");
    expect(html).toContain(`<html lang="en">`);
    expect(html).toContain(`<meta charset="utf-8">`);
    expect(html).toContain(`<title>Home</title>`);
    expect(html).toContain(`<p>hi</p>`);
  });

  test("charset and lang are explicit layout options", () => {
    const tree = document({ lang: "id", charset: "ascii", children: null });
    const html = renderDocument(tree, renderNode);
    expect(html).toContain(`<html lang="id">`);
    expect(html).toContain(`<meta charset="ascii">`);
  });

  test("omitting lang emits html without a lang attribute", () => {
    const tree = document({ children: null });
    expect(renderDocument(tree, renderNode)).toContain(`<html>`);
  });

  test("nested or duplicate html roots fail clearly", () => {
    const duplicate = jsxs("div", {
      children: [jsx("html", {}), jsx("html", {})],
    });
    expect(() => renderDocument(duplicate, renderNode)).toThrow(
      DuplicateDocumentRootError,
    );

    const nested = jsx("html", {
      children: jsx("html", { lang: "x" }),
    });
    expect(() => renderDocument(nested, renderNode)).toThrow(
      DuplicateDocumentRootError,
    );
  });

  test("a single html root renders with doctype", () => {
    const single = jsx("html", { children: jsx("body", { children: "x" }) });
    const html = renderDocument(single, renderNode);
    expect(html.startsWith(DOCTYPE)).toBe(true);
    expect(html).toContain(`<body>x</body>`);
  });
});

// BR-087: optional head slot renders after charset/title (htmx meta config).
describe("document head slot", () => {
  test("head content renders inside <head> after the title", async () => {
    const { renderToString } = await import("../../src/index");
    const { document } = await import("../../src/index");
    const html = renderToString(
      document({
        lang: "en",
        title: "T",
        head: jsx("meta", { name: "htmx-config", content: "{}" }),
        children: jsx("main", { children: "body" }),
      }),
    );
    const head = html.slice(0, html.indexOf("</head>"));
    expect(head).toContain('<meta charset="utf-8">');
    expect(head.indexOf("<title>")).toBeLessThan(
      head.indexOf('name="htmx-config"'),
    );
    expect(head).toContain('name="htmx-config"');
    expect(html.slice(html.indexOf("<body>"))).not.toContain("htmx-config");
  });

  test("head omitted renders exactly as before", async () => {
    const { document, renderToString } = await import("../../src/index");
    const html = renderToString(
      document({ lang: "en", title: "T", children: jsx("main", {}) }),
    );
    expect(html).toContain("</head><body>");
  });
});
