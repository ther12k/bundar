/**
 * GH-036 browser comparison server: serves rendered snippets for edge cases
 * where browser DOM interpretation is the ground truth (raw-text elements,
 * void elements, attribute round-trips, RCDATA, Unicode).
 */
import { jsx, raw, renderToString } from "../../../packages/jsx/src/index";

export interface EdgeCase {
  readonly id: string;
  readonly html: string;
}

function page(body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>jsx</title></head><body>${body}</body></html>`;
}

export const edgeCases: readonly EdgeCase[] = [
  {
    id: "void-elements",
    html: page(
      renderToString(
        jsx("div", {
          children: [
            jsx("input", { type: "text", name: "q", disabled: true }),
            jsx("img", { src: "/x.png", alt: "x" }),
            jsx("br", {}),
          ],
        }),
      ),
    ),
  },
  {
    id: "script-raw-text",
    html: page(
      renderToString(
        jsx("script", {
          id: "probe",
          children: "window.__jsxProbe = (a<b) ? '</script>' : 'x';",
        }),
      ),
    ),
  },
  {
    id: "attribute-roundtrip",
    html: page(
      renderToString(
        jsx("a", {
          id: "link",
          href: "/x?a=1&b=2",
          title: 'He said "hi" & <left>',
        }),
      ),
    ),
  },
  {
    id: "rcdata-title-textarea",
    html: page(
      renderToString(
        jsx("div", {
          children: [
            jsx("textarea", {
              id: "ta",
              children: "</textarea><b>not-bold</b>",
            }),
            jsx("div", { id: "tawrap" }),
          ],
        }),
      ),
    ),
  },
  {
    id: "unicode-text",
    html: page(
      renderToString(jsx("p", { id: "uni", children: "日本語 café 🎉 𝕏 ñ" })),
    ),
  },
  {
    id: "raw-trust",
    html: page(
      renderToString(
        jsx("div", {
          id: "rawwrap",
          children: raw("<em data-raw>trusted</em>"),
        }),
      ),
    ),
  },
];

export async function startJsxServer(): Promise<ReturnType<typeof Bun.serve>> {
  return Bun.serve({
    port: 0,
    fetch: (request) => {
      const url = new URL(request.url);
      const match = url.pathname.match(/^\/case\/(.+)$/);
      const found =
        match === null ? undefined : edgeCases.find((c) => c.id === match[1]);
      if (found !== undefined) {
        return new Response(found.html, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      return new Response("not-found", { status: 404 });
    },
  });
}
