/**
 * GH-049 representation-poisoning fixtures through the simulated proxy:
 * page and fragment variants of one URL never overwrite each other under
 * the policy's Vary, wrong/no Vary reproduces the poisoning risk, and
 * private/no-store responses are never stored.
 */
import { describe, expect, test } from "bun:test";
import { SimulatedProxyCache } from "./simulated-proxy";
import {
  applyCachePolicy,
  cachePolicyFor,
  negotiateView,
  normalizeHtmxRequest,
  VIEW_VARY_HEADERS,
} from "../../packages/htmx/src/index";

const URL_PATH = "http://localhost/items";

function policyResponse(requestHeaders: Record<string, string>): Response {
  const negotiated = negotiateView(
    normalizeHtmxRequest(new Request(URL_PATH, { headers: requestHeaders })),
  );
  return applyCachePolicy(
    new Response(
      negotiated.representation === "fragment"
        ? "<section>frag</section>"
        : "<!doctype html><html>doc</html>",
      { headers: { "content-type": "text/html; charset=utf-8" } },
    ),
    cachePolicyFor(negotiated, { sMaxage: 60 }), // shared caching opted in
  );
}

describe("GH-049 representation poisoning fixtures", () => {
  test("page and fragment variants coexist under the policy Vary", () => {
    const cache = new SimulatedProxyCache();
    const pageHeaders = new Headers();
    const fragmentHeaders = new Headers({ "HX-Request": "true" });

    const page = policyResponse({});
    expect(cache.store(page, URL_PATH, "doc-body", pageHeaders)).toBe(true);
    const fragment = policyResponse({ "HX-Request": "true" });
    expect(cache.store(fragment, URL_PATH, "frag-body", fragmentHeaders)).toBe(
      true,
    );

    expect(cache.variants(URL_PATH)).toBe(2);
    expect(cache.lookup(URL_PATH, pageHeaders)?.body).toBe("doc-body");
    expect(cache.lookup(URL_PATH, fragmentHeaders)?.body).toBe("frag-body");
  });

  test("missing Vary reproduces the poisoning risk (variant overwritten)", () => {
    const cache = new SimulatedProxyCache();
    const pageHeaders = new Headers();
    const fragmentHeaders = new Headers({ "HX-Request": "true" });
    const bare = () =>
      new Response("x", {
        headers: { "cache-control": "public, max-age=0, s-maxage=60" },
      });
    cache.store(bare(), URL_PATH, "doc-body", pageHeaders);
    cache.store(bare(), URL_PATH, "frag-body", fragmentHeaders);
    // without Vary there is ONE stored body — whichever variant stored last
    expect(cache.variants(URL_PATH)).toBe(1);
    expect(cache.lookup(URL_PATH, pageHeaders)?.body).toBe("frag-body");
  });

  test("partial Vary (HX-Request only) still separates document variants", () => {
    const cache = new SimulatedProxyCache();
    const withPolicy = (headers: Record<string, string>) => {
      const response = policyResponse(headers);
      // handler-supplied vary would merge; simulate a partial one instead
      return new Response(response.body, {
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          vary: "HX-Request",
        },
      });
    };
    const boostedHeaders = new Headers({
      "HX-Request": "true",
      "HX-Boosted": "true",
    });
    const enhancedHeaders = new Headers({ "HX-Request": "true" });
    cache.store(withPolicy({}), URL_PATH, "doc", new Headers());
    cache.store(
      withPolicy({ "HX-Request": "true", "HX-Boosted": "true" }),
      URL_PATH,
      "boosted-doc",
      boostedHeaders,
    );
    // HX-Request matches for both variants — the boosted document is the
    // one served to the enhanced fragment request: the RESIDUAL RISK a
    // partial Vary carries, which the full policy Vary avoids
    expect(cache.lookup(URL_PATH, enhancedHeaders)?.body).toBe("boosted-doc");
  });

  test("private and no-store responses are never stored", () => {
    const cache = new SimulatedProxyCache();
    const headers = new Headers();
    const privateResponse = applyCachePolicy(
      new Response("secret"),
      cachePolicyFor(
        negotiateView(normalizeHtmxRequest(new Request(URL_PATH))),
        {
          private: true,
        },
      ),
    );
    expect(cache.store(privateResponse, URL_PATH, "secret", headers)).toBe(
      false,
    );
    const defaultResponse = applyCachePolicy(
      new Response("x"),
      cachePolicyFor(
        negotiateView(normalizeHtmxRequest(new Request(URL_PATH))),
      ),
    );
    expect(cache.store(defaultResponse, URL_PATH, "body", headers)).toBe(false);
    expect(cache.variants(URL_PATH)).toBe(0);
  });

  test("full policy Vary separates every negotiation input", () => {
    const cache = new SimulatedProxyCache();
    const variants: Array<[Record<string, string>, string]> = [
      [{}, "doc"],
      [{ "HX-Request": "true" }, "frag"],
      [{ "HX-Request": "true", "HX-Boosted": "true" }, "boosted-doc"],
      [
        { "HX-Request": "true", "HX-History-Restore-Request": "true" },
        "restore-doc",
      ],
    ];
    for (const [headers, body] of variants) {
      const response = policyResponse(headers);
      const requestHeaders = new Headers(Object.entries(headers));
      expect(cache.store(response, URL_PATH, body, requestHeaders)).toBe(true);
    }
    expect(cache.variants(URL_PATH)).toBe(4);
    for (const [headers, body] of variants) {
      const requestHeaders = new Headers(Object.entries(headers));
      expect(cache.lookup(URL_PATH, requestHeaders)?.body).toBe(body);
    }
    expect(VIEW_VARY_HEADERS).toContain("HX-History-Restore-Request");
  });
});
