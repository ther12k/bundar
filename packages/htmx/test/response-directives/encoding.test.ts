import { describe, expect, test } from "bun:test";
import { htmx2 } from "../../src/v2";
import { htmx4Experimental } from "../../src/v4";
import {
  applyDirectives,
  DirectiveConflictError,
  DirectiveValidationError,
  encodeDirectives,
  normalizeDirectives,
} from "../../src/directives";
import type { HtmxResponseDirective } from "../../src/dialect";

describe("GH-042 directive encoding", () => {
  test("encodes every directive kind to its HX header", () => {
    const headers = encodeDirectives([{ kind: "redirect", url: "/gone" }]);
    expect(headers.get("HX-Redirect")).toBe("/gone");

    const all = encodeDirectives([
      { kind: "reswap", strategy: "outerHTML" },
      { kind: "retarget", selector: "#main" },
      { kind: "reselect", selector: "li.active" },
      { kind: "refresh" },
      { kind: "push-url", url: "/next" },
    ]);
    expect(all.get("HX-Reswap")).toBe("outerHTML");
    expect(all.get("HX-Retarget")).toBe("#main");
    expect(all.get("HX-Reselect")).toBe("li.active");
    expect(all.get("HX-Refresh")).toBe("true");
    expect(all.get("HX-Push-URL")).toBe("/next");
  });

  test("push-url false encodes the literal string", () => {
    expect(
      encodeDirectives([{ kind: "push-url", url: false }]).get("HX-Push-URL"),
    ).toBe("false");
  });

  test("encoding is deterministic regardless of input order", () => {
    const a = encodeDirectives([
      { kind: "retarget", selector: "#a" },
      { kind: "reswap", strategy: "innerHTML" },
      { kind: "trigger", events: [{ name: "b" }, { name: "a" }] },
    ]);
    const b = encodeDirectives([
      { kind: "trigger", events: [{ name: "a" }, { name: "b" }] },
      { kind: "reswap", strategy: "innerHTML" },
      { kind: "retarget", selector: "#a" },
    ]);
    expect([...a.entries()]).toEqual([...b.entries()]);
  });
});

describe("GH-042 conflict detection", () => {
  test("two navigation directives fail before encoding", () => {
    expect(() =>
      encodeDirectives([
        { kind: "redirect", url: "/a" },
        { kind: "push-url", url: "/b" },
      ]),
    ).toThrow(DirectiveConflictError);
    expect(() =>
      encodeDirectives([
        { kind: "location", url: "/a" },
        { kind: "replace-url", url: "/b" },
      ]),
    ).toThrow(/conflicting response directives/);
  });

  test("duplicate non-trigger directives fail", () => {
    expect(() =>
      encodeDirectives([
        { kind: "reswap", strategy: "a" },
        { kind: "reswap", strategy: "b" },
      ]),
    ).toThrow(DirectiveConflictError);
  });

  test("multiple triggers merge instead of conflicting", () => {
    const headers = encodeDirectives([
      { kind: "trigger", events: [{ name: "saved", detail: { id: 1 } }] },
      { kind: "trigger", events: [{ name: "refreshed" }] },
    ]);
    expect(JSON.parse(headers.get("HX-Trigger")!)).toEqual({
      saved: { id: 1 },
      refreshed: {},
    });
  });

  test("first trigger definition wins on duplicate event names", () => {
    const headers = encodeDirectives([
      { kind: "trigger", events: [{ name: "evt", detail: "first" }] },
      { kind: "trigger", events: [{ name: "evt", detail: "second" }] },
    ]);
    expect(JSON.parse(headers.get("HX-Trigger")!).evt).toBe("first");
  });
});

describe("GH-042 header-injection validation", () => {
  test("CRLF in URLs, selectors, and strategies is rejected", () => {
    expect(() =>
      encodeDirectives([{ kind: "redirect", url: "/x\r\nSet-Cookie: e=1" }]),
    ).toThrow(DirectiveValidationError);
    expect(() =>
      encodeDirectives([{ kind: "retarget", selector: "#x\r\nX: y" }]),
    ).toThrow(DirectiveValidationError);
    expect(() =>
      encodeDirectives([{ kind: "reswap", strategy: "a\nb" }]),
    ).toThrow(DirectiveValidationError);
  });

  test("invalid selectors and event names are rejected", () => {
    expect(() =>
      encodeDirectives([{ kind: "retarget", selector: "{{bad}}" }]),
    ).toThrow(/selector/);
    expect(() =>
      encodeDirectives([{ kind: "trigger", events: [{ name: "bad name!" }] }]),
    ).toThrow(/event names/);
  });

  test("URL values with invalid characters are rejected", () => {
    expect(() =>
      encodeDirectives([{ kind: "location", url: "not a url" }]),
    ).toThrow(/url contains invalid characters/);
  });
});

describe("GH-042 neutrality across dialect fixtures", () => {
  const directives: readonly HtmxResponseDirective[] = [
    { kind: "retarget", selector: "#main" },
    { kind: "reswap", strategy: "innerHTML" },
    { kind: "trigger", events: [{ name: "done" }] },
  ];

  test("both dialect adapters encode the same neutral object identically", () => {
    const v2Headers = htmx2.encodeResponseDirective;
    const v4Headers = htmx4Experimental.encodeResponseDirective;
    for (const directive of directives) {
      expect(v4Headers(directive).entries()).toEqual(
        v2Headers(directive).entries(),
      );
    }
    // and the directive-encoder produces the same headers per directive
    for (const directive of directives) {
      expect(encodeDirectives([directive]).entries()).toEqual(
        v2Headers(directive).entries(),
      );
    }
  });

  test("applyDirectives preserves the original response and other headers", () => {
    const original = new Response("body", {
      status: 201,
      headers: { "content-type": "text/html", "x-custom": "keep" },
    });
    const next = applyDirectives(original, directives);
    expect(original.headers.get("HX-Retarget")).toBeNull();
    expect(next.status).toBe(201);
    expect(next.headers.get("content-type")).toBe("text/html");
    expect(next.headers.get("x-custom")).toBe("keep");
    expect(next.headers.get("HX-Retarget")).toBe("#main");
  });

  test("normalizeDirectives orders navigation before targeting before triggers", () => {
    const ordered = normalizeDirectives([
      { kind: "trigger", events: [{ name: "t" }] },
      { kind: "retarget", selector: "#x" },
      { kind: "redirect", url: "/r" },
    ]);
    expect(ordered.map((d) => d.kind)).toEqual([
      "redirect",
      "retarget",
      "trigger",
    ]);
  });
});
