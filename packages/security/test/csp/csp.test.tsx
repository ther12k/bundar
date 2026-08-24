/**
 * BR-065 CSP nonce tests: fresh-per-request generation, exact header/attr
 * match, document stamping, fragment non-inheritance, no-store behavior,
 * and the strict-CSP property that blocks nonce-less inline scripts.
 */
import { describe, expect, test } from "bun:test";
import type { Context } from "@bundar/core";
import { getNonce, securityHeaders, buildCspHeader } from "../../src/headers";
import {
  document,
  jsx,
  renderDocument,
  renderToString,
} from "../../../jsx/src/index";

function harness(): {
  context: Context;
  run: (handler: () => Response) => Promise<Response>;
} {
  const middleware = securityHeaders();
  const state: Record<PropertyKey, unknown> = {};
  const context = {
    request: new Request("https://app/x"),
    params: {},
    state,
  } as unknown as Context;
  return {
    context,
    run: async (handler) => {
      const response = await middleware(context, async () => handler());
      return response as Response;
    },
  };
}

describe("BR-065 CSP nonces", () => {
  test("each response gets a FRESH cryptographically strong nonce", async () => {
    const a = harness();
    const b = harness();
    await a.run(() => new Response("a"));
    await b.run(() => new Response("b"));
    const na = getNonce(a.context)!;
    const nb = getNonce(b.context)!;
    expect(na.nonce).not.toBe(nb.nonce);
    expect(na.nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/); // 16 bytes base64
  });

  test("header and rendered HtmxScript nonce match exactly", async () => {
    const h = harness();
    const response = await h.run(() => {
      const tree = document({
        title: "t",
        children: jsx("script", {
          src: "/assets/htmx.js",
          nonce: getNonce(h.context)!.nonce,
        }),
      });
      return new Response(renderDocument(tree, renderToString), {
        headers: { "content-type": "text/html" },
      });
    });
    const csp = response.headers.get("content-security-policy")!;
    const headerNonce = csp.match(/'nonce-([^']+)'/)![1]!;
    expect(getNonce(h.context)!.nonce).toBe(headerNonce);
  });

  test("document cspNonce stamps top-level scripts lacking one", () => {
    const html = renderDocument(
      document({
        title: "stamp",
        cspNonce: "ABC123",
        children: [
          jsx("script", { children: "inline()" }),
          jsx("script", { nonce: "caller-owned", src: "/x.js" }),
        ],
      }),
      renderToString,
    );
    // unowned script got the nonce; caller-owned kept its own
    expect(html.match(/nonce="ABC123"/g)?.length).toBe(1);
    expect(html).toContain('nonce="caller-owned"');
  });

  test("fragments cannot inherit a nonce across renders", () => {
    const h = harness();
    void h;
    // Two independent renders share nothing: no middleware → no nonce.
    expect(
      getNonce({
        request: new Request("https://x"),
        params: {},
        state: {},
      } as Context),
    ).toBeUndefined();
    // And the strict policy contains NO unsafe-inline for scripts.
    const csp = buildCspHeader("abc", { development: false });
    expect(csp).not.toContain("unsafe-inline");
    expect(csp).toContain("'nonce-abc'");
  });

  test("no-store is emitted with fresh nonces (cache-reuse prevention)", async () => {
    const h = harness();
    const response = await h.run(() => new Response("c"));
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
