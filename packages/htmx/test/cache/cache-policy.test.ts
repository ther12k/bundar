/**
 * GH-049 cache policy tests: Vary merge without loss, fail-safe defaults,
 * validated opt-ins, history facts per dialect, and response application.
 */
import { describe, expect, test } from "bun:test";
import {
  applyCachePolicy,
  cachePolicyFor,
  CachePolicyError,
  historyPolicyFor,
  mergeVary,
  negotiateView,
  normalizeHtmxRequest,
  VIEW_VARY_HEADERS,
} from "../../src/index";
import { htmx2 } from "../../src/dialects/v2/index";
import { htmx4Experimental } from "../../src/dialects/v4/index";

function negotiated(headers: Record<string, string> = {}) {
  return negotiateView(
    normalizeHtmxRequest(new Request("http://localhost/items", { headers })),
  );
}

describe("GH-049 mergeVary", () => {
  test("merges without loss and dedupes case-insensitively", () => {
    expect(
      mergeVary("Cookie", ["HX-Request", "hx-request", "Accept-Encoding"]),
    ).toBe("Cookie, HX-Request, Accept-Encoding");
    expect(mergeVary(null, VIEW_VARY_HEADERS)).toBe(
      "HX-Request, HX-Boosted, HX-History-Restore-Request",
    );
    expect(mergeVary("Cookie, Accept", [])).toBe("Cookie, Accept");
    expect(mergeVary(" Cookie ,,  accept ", ["accept"])).toBe("Cookie, accept");
  });
});

describe("GH-049 cachePolicyFor defaults and opt-ins", () => {
  test("documents and fragments default to no-store with full vary", () => {
    for (const policy of [
      cachePolicyFor(negotiated()),
      cachePolicyFor(negotiated({ "HX-Request": "true" })),
    ]) {
      expect(policy.cacheControl).toBe("no-store");
      expect(policy.vary).toEqual(VIEW_VARY_HEADERS);
    }
  });

  test("shared caching is an explicit opt-in with public semantics", () => {
    const policy = cachePolicyFor(negotiated(), { sMaxage: 60 });
    expect(policy.cacheControl).toBe("public, max-age=0, s-maxage=60");
  });

  test("client caching opts in privately by default", () => {
    expect(cachePolicyFor(negotiated(), { maxAge: 30 }).cacheControl).toBe(
      "private, max-age=30",
    );
  });

  test("authenticated content stays private", () => {
    expect(cachePolicyFor(negotiated(), { private: true }).cacheControl).toBe(
      "private, no-store",
    );
    expect(
      cachePolicyFor(negotiated(), { private: true, maxAge: 30 }).cacheControl,
    ).toBe("private, max-age=30");
  });

  test("unsafe combinations fail closed", () => {
    expect(() =>
      cachePolicyFor(negotiated(), { private: true, sMaxage: 60 }),
    ).toThrow(CachePolicyError);
    expect(() =>
      cachePolicyFor(negotiated(), { sMaxage: 30, maxAge: 60 }),
    ).toThrow(CachePolicyError);
  });
});

describe("GH-049 applyCachePolicy", () => {
  test("vary merges with existing values; cache-control set only if absent", () => {
    const response = new Response("<p>x</p>", {
      headers: { vary: "Cookie" },
    });
    const applied = applyCachePolicy(
      response,
      cachePolicyFor(negotiated({ "HX-Request": "true" })),
    );
    expect(applied.headers.get("vary")).toBe(
      `Cookie, ${VIEW_VARY_HEADERS.join(", ")}`,
    );
    expect(applied.headers.get("cache-control")).toBe("no-store");
  });

  test("explicit handler cache-control is an override, never clobbered", () => {
    const response = new Response("x", {
      headers: { "cache-control": "public, max-age=999" },
    });
    const applied = applyCachePolicy(
      response,
      cachePolicyFor(negotiated(), { private: true }),
    );
    expect(applied.headers.get("cache-control")).toBe("public, max-age=999");
    // vary still applied — privacy of variant selection is independent
    expect(applied.headers.get("vary")).toBe(VIEW_VARY_HEADERS.join(", "));
  });
});

describe("GH-049 explicit history facts per dialect", () => {
  test("htmx 2 restores via the header and pushes urls by default", () => {
    const policy = historyPolicyFor(htmx2);
    expect(policy.restoreRequestHeader).toBe("HX-History-Restore-Request");
    expect(policy.pushUrlDefault).toBe(true);
  });

  test("the htmx 4 beta records its provisional history differences", () => {
    const policy = historyPolicyFor(htmx4Experimental);
    expect(policy.pushUrlDefault).toBe(true);
    // the pinned profile's provisional difference is surfaced as a note
    expect(policy.notes.join(" ")).toContain("reworks history cache");
  });
});
