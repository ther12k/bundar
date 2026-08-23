/**
 * BR-064 attack-corpus tests: every directive class validated against the
 * hostile-value corpus, plus AMEND-1 revalidation of the BR-054 response
 * helpers. Protocol-local validation only (ADR-0018 preserved).
 */
import { describe, expect, test } from "bun:test";
import { applyDirectives } from "../../src/directives";
import type { HtmxResponseDirective } from "../../src/dialect";
import { DirectiveValidationError } from "../../src/directives";
// AMEND-1 revalidation target: BR-054 helpers live in @bundar/core.
import { serializeCookie, withHeader, withSetCookie } from "@bundar/core";

const CR = "\r\n";

function directives(list: readonly HtmxResponseDirective[]): Headers {
  return applyDirectives(new Response("x"), list).headers;
}

describe("BR-064 directive value validation", () => {
  test("redirect/location reject dangerous schemes and injection", () => {
    for (const url of [
      `javascript:alert(1)${CR}`,
      " data:text/html,<script>",
      "JaVaScRiPt:alert(1)",
      `https://good.example${CR}Set-Cookie: pwned=1`,
      "/x%n",
    ]) {
      expect(() => directives([{ kind: "redirect", url } as never])).toThrow(
        DirectiveValidationError,
      );
    }
  });

  test("credential-bearing and traversal URLs fail closed", () => {
    for (const url of [
      "https://user:pass@evil.example/",
      "/%2e%2e/%2e%2e/etc/passwd",
      "/safe/../../../etc/passwd",
    ]) {
      let threw = false;
      try {
        directives([
          { kind: "location", url } as unknown as HtmxResponseDirective,
        ]);
      } catch (error) {
        threw = error instanceof DirectiveValidationError;
      }
      expect(threw, `expected rejection for ${url}`).toBe(true);
    }
  });

  test("legitimate relative and encoded-safe URLs pass", () => {
    // Navigation directives conflict when combined (GH-068 rule) — test
    // each in its own response.
    const redirected = directives([
      { kind: "redirect", url: "/todos?filter=active" } as never,
    ]);
    expect(redirected.get("HX-Redirect")).toBe("/todos?filter=active");
    const pushed = directives([
      { kind: "push-url", url: "/todos?page=2" } as never,
    ]);
    expect(pushed.get("HX-Push-URL")).toBe("/todos?page=2");
  });

  test("retarget/reselect selectors reject injection characters", () => {
    for (const selector of ["#a; alert(1)", '#x" onerror="', "#a\\"]) {
      expect(() =>
        directives([
          { kind: "retarget", selector } as unknown as HtmxResponseDirective,
        ]),
      ).toThrow(DirectiveValidationError);
    }
    const ok = directives([
      { kind: "retarget", selector: "#todo-list .item[data-x=1]" } as never,
    ]);
    expect(ok.get("HX-Retarget")).toBe("#todo-list .item[data-x=1]");
  });

  test("reswap strategies outside the known set fail", () => {
    expect(() =>
      directives([{ kind: "reswap", strategy: "innerHTML show:top" } as never]),
    ).not.toThrow();
    expect(() =>
      directives([{ kind: "reswap", strategy: `${CR} innerHTML` } as never]),
    ).toThrow(DirectiveValidationError);
  });

  test("event names validate each comma-separated segment", () => {
    const ok = directives([
      {
        kind: "trigger",
        events: [{ name: "todoAdded,todoChanged" }],
      } as never,
    ]);
    expect(ok.get("HX-Trigger")).toContain("todoAdded");

    for (const bad of ["ev, ", "a b c", `${CR}x`]) {
      expect(() =>
        directives([{ kind: "trigger", events: [{ name: bad }] } as never]).get(
          "HX-Trigger",
        ),
      ).toThrow(DirectiveValidationError);
    }
  });

  test("trigger payloads enforce size cap and prototype-key rejection", () => {
    const big = "x".repeat(5000);
    expect(() =>
      directives([
        {
          kind: "trigger",
          events: [{ name: "big", detail: { big } }],
        } as never,
      ]),
    ).toThrow(/exceeds 4096 bytes/);

    const malicious = JSON.parse('{"__proto__": {"injected": true}}');
    expect(() =>
      directives([
        {
          kind: "trigger",
          events: [{ name: "proto", detail: malicious }],
        } as never,
      ]),
    ).toThrow(/prototype-like key/);
  });

  test("AMEND-1 revalidation: BR-054 helpers reject hostile values", () => {
    // header values
    expect(() => withHeader(new Response(), "x-a", `${CR}evil`)).toThrow();
    // cookie serialization
    expect(() => serializeCookie("sid", "va;lue")).toThrow();
    expect(() => serializeCookie("na;me", "v")).toThrow();
    // replaceSameName cookie append keeps other cookies intact
    const base = new Response("ok", {
      headers: { "set-cookie": "other=1; Path=/" },
    });
    const mutated = withSetCookie(
      base,
      { name: "bundar.csrf", value: "t", options: { httpOnly: true } },
      { replaceSameName: true },
    );
    const setCookies = mutated.headers.getSetCookie();
    expect(setCookies.some((c) => c.startsWith("bundar.csrf="))).toBe(true);
    expect(setCookies.some((c) => c.startsWith("other=1"))).toBe(true);
  });
});
