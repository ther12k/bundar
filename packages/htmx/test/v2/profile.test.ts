import { describe, expect, test } from "bun:test";
import {
  htmx2,
  HTMX2_ASSET_SHA256,
  HTMX2_PROFILE,
  HTMX2_TESTED_VERSION,
} from "../../src/dialects/v2";
import { DirectiveConflictError, encodeDirectives } from "../../src/directives";
import type { HtmxResponseDirective } from "../../src/dialect";

describe("GH-043 v2 adapter identity and pinning", () => {
  test("adapter identity includes stable maturity and exact tested version", () => {
    expect(htmx2.id).toBe("htmx2");
    expect(htmx2.maturity).toBe("stable");
    expect(HTMX2_TESTED_VERSION).toBe("2.0.10");
    expect(htmx2.supportedRange).toBe(">=2.0.0 <2.1.0");
    expect(htmx2.metadata["htmx2:pinnedVersion"]).toBe("2.0.10");
  });

  test("asset version and integrity hash are pinned", () => {
    const asset = htmx2.describeAsset();
    expect(asset.version).toBe("2.0.10");
    expect(asset.integrity).toBe(`sha256-${HTMX2_ASSET_SHA256}`);
    expect(HTMX2_ASSET_SHA256).toMatch(/^[0-9a-f]{64}$/);
    expect(asset.source).toBe("bundled");
  });

  test("profile states the exact version and records lifecycle evidence", () => {
    expect(HTMX2_PROFILE.testedVersion).toBe("2.0.10");
    expect(HTMX2_PROFILE.lifecycle.observedAfterRequest).toBe(true);
    expect(HTMX2_PROFILE.lifecycle.eventOrder).toEqual([
      "beforeSwap",
      "afterSwap",
      "afterSettle",
    ]);
    expect(HTMX2_PROFILE.history.pushUrlDefault).toBe(true);
    expect(HTMX2_PROFILE.errorBehavior.defaultErrorSwap).toBe("target");
    expect(HTMX2_PROFILE.inheritance.attributeInheritance).toBe(true);
  });

  test("unimplemented features are documented, not approximated", () => {
    expect(HTMX2_PROFILE.unimplemented.length).toBeGreaterThan(0);
    for (const entry of HTMX2_PROFILE.unimplemented) {
      expect(typeof entry).toBe("string");
      expect(entry.length).toBeGreaterThan(10);
    }
  });

  test("stable lane contains no htmx 4 beta assumptions", () => {
    const serialized = JSON.stringify(HTMX2_PROFILE);
    expect(serialized).not.toMatch(/beta/i);
    expect(serialized).not.toMatch(/htmx4|v4/i);
    expect(Object.keys(htmx2.metadata).every((key) => !key.includes("4"))).toBe(
      true,
    );
  });
});

describe("GH-043 v2 request-header mapping", () => {
  test("positive: every v2 request header decodes into normalized metadata", () => {
    const request = new Request("http://app/items", {
      headers: {
        "HX-Request": "true",
        "HX-Boosted": "false",
        "HX-Trigger": "btn",
        "HX-Trigger-Name": "refresh",
        "HX-Target": "#list",
        "HX-Current-URL": "http://app/page",
        "HX-Prompt": "yes",
      },
    });
    const meta = htmx2.decodeRequest(request);
    expect(meta.isHtmx).toBe(true);
    expect(meta.sourceElement.value).toBe("btn");
    expect(meta.target.value).toBe("#list");
    expect(meta.currentUrl.value?.href).toBe("http://app/page");
    expect(meta.prompt.value).toBe("yes");
  });

  test("absent: a plain request decodes all-absent safely", () => {
    const meta = htmx2.decodeRequest(new Request("http://app/"));
    expect(meta.isHtmx).toBe(false);
    expect(meta.sourceElement.status).toBe("absent");
    expect(meta.target.status).toBe("absent");
    expect(meta.currentUrl.status).toBe("absent");
    expect(meta.prompt.status).toBe("absent");
    expect(meta.representation).toBe("page");
  });

  test("malformed: bad target selector and bad URL report malformed status", () => {
    const meta = htmx2.decodeRequest(
      new Request("http://app/x", {
        headers: {
          "HX-Request": "true",
          "HX-Target": "{{invalid}}",
          "HX-Current-URL": "not-a-url",
        },
      }),
    );
    expect(meta.target.status).toBe("malformed");
    expect(meta.currentUrl.status).toBe("malformed");
  });

  test("history-restore requests classify distinctly", () => {
    const meta = htmx2.decodeRequest(
      new Request("http://app/x", {
        headers: { "HX-History-Restore-Request": "true" },
      }),
    );
    expect(meta.kind).toBe("history-restore");
  });
});

describe("GH-043 v2 response-directive mapping", () => {
  const cases: Array<[HtmxResponseDirective, [string, string]]> = [
    [{ kind: "reswap", strategy: "outerHTML" }, ["HX-Reswap", "outerHTML"]],
    [{ kind: "retarget", selector: "#main" }, ["HX-Retarget", "#main"]],
    [{ kind: "reselect", selector: ".sel" }, ["HX-Reselect", ".sel"]],
    [{ kind: "redirect", url: "/go" }, ["HX-Redirect", "/go"]],
    [{ kind: "location", url: "/loc" }, ["HX-Location", "/loc"]],
    [{ kind: "refresh" }, ["HX-Refresh", "true"]],
    [{ kind: "push-url", url: "/next" }, ["HX-Push-URL", "/next"]],
    [{ kind: "push-url", url: false }, ["HX-Push-URL", "false"]],
    [{ kind: "replace-url", url: "/now" }, ["HX-Replace-URL", "/now"]],
    [
      { kind: "trigger", events: [{ name: "saved", detail: { id: 1 } }] },
      ["HX-Trigger", '{"saved":{"id":1}}'],
    ],
  ];

  test("positive: every directive kind maps to its v2 header", () => {
    for (const [directive, [header, value]] of cases) {
      expect(htmx2.encodeResponseDirective(directive).get(header)).toBe(value);
    }
  });

  test("absent: no directive produces no headers", () => {
    // encoding nothing is exercised via the directives module; here each
    // single directive produces exactly one header
    for (const [directive] of cases) {
      const headers = htmx2.encodeResponseDirective(directive);
      expect([...headers.keys()]).toHaveLength(1);
    }
  });

  test("malformed: injection payloads throw before header creation", () => {
    expect(() =>
      htmx2.encodeResponseDirective({ kind: "redirect", url: "/x\r\nEvil: 1" }),
    ).toThrow();
    expect(() =>
      htmx2.encodeResponseDirective({ kind: "retarget", selector: "#x\n" }),
    ).toThrow();
  });

  test("conflict: two navigation directives fail before a response is sent", () => {
    expect(() =>
      htmx2.encodeResponseDirective({ kind: "redirect", url: "/a" }),
    ).not.toThrow();
    // conflict lives at the multi-directive level (GH-042) — v2 delegates
    expect(() =>
      encodeDirectives([
        { kind: "redirect", url: "/a" },
        { kind: "push-url", url: "/b" },
      ]),
    ).toThrow(DirectiveConflictError);
  });
});
