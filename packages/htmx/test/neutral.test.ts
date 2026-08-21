import { describe, expect, test } from "bun:test";
import {
  HTMX_REQUEST_HEADERS,
  HTMX_RESPONSE_HEADERS,
  getHtmxTarget,
  getHtmxTrigger,
  isBoostedRequest,
  isHtmxRequest,
  withHtmxHeaders,
} from "../src/index";
import { htmx2 } from "../src/v2";
import { htmx4Experimental } from "../src/v4";

describe("GH-039 @bundar/htmx neutral protocol model", () => {
  test("header lists are complete and frozen", () => {
    expect(HTMX_REQUEST_HEADERS).toContain("HX-Request");
    expect(HTMX_REQUEST_HEADERS).toContain("HX-Target");
    expect(HTMX_RESPONSE_HEADERS).toContain("HX-Reswap");
    expect(HTMX_RESPONSE_HEADERS).toContain("HX-Trigger-After-Swap");
  });

  test("isHtmxRequest detects the HX-Request header", () => {
    const htmx = new Request("https://example.com/", {
      headers: { "HX-Request": "true" },
    });
    const plain = new Request("https://example.com/");
    expect(isHtmxRequest(htmx)).toBe(true);
    expect(isHtmxRequest(plain)).toBe(false);
    expect(isBoostedRequest(htmx)).toBe(false);
  });

  test("getHtmxTarget and getHtmxTrigger return header values", () => {
    const req = new Request("https://example.com/", {
      headers: { "HX-Target": "main", "HX-Trigger": "btn-submit" },
    });
    expect(getHtmxTarget(req)).toBe("main");
    expect(getHtmxTrigger(req)).toBe("btn-submit");
    expect(getHtmxTarget(new Request("https://example.com/"))).toBeNull();
  });

  test("withHtmxHeaders appends response headers non-mutably", () => {
    const original = new Response("body", { status: 200 });
    const next = withHtmxHeaders(original, {
      "HX-Reswap": "outerHTML",
      "HX-Trigger-After-Swap": "refreshed",
    });
    expect(original.headers.get("HX-Reswap")).toBeNull();
    expect(next.headers.get("HX-Reswap")).toBe("outerHTML");
    expect(next.headers.get("HX-Trigger-After-Swap")).toBe("refreshed");
    expect(next.status).toBe(200);
  });

  test("htmx2 adapter is stable and correctly pinned", () => {
    expect(htmx2.id).toBe("htmx2");
    expect(htmx2.maturity).toBe("stable");
    expect(htmx2.metadata["htmx2:pinnedVersion"]).toBe("2.0.10");
    expect(Object.isFrozen(htmx2)).toBe(true);
  });

  test("htmx4 adapter is visibly experimental and version-pinned", () => {
    expect(htmx4Experimental.id).toBe("htmx4");
    expect(htmx4Experimental.maturity).toBe("experimental");
    expect(htmx4Experimental.metadata["htmx4:pinnedVersion"]).toBe(
      "4.0.0-beta6",
    );
    expect(htmx4Experimental.metadata["htmx4:pinnedVersion"]).not.toBe("4.0.0");
    expect(Object.isFrozen(htmx4Experimental)).toBe(true);
  });
});
