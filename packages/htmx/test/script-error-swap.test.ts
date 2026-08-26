/**
 * BR-087 (#139): HtmxScript renders the dialect-owned error-swap preset
 * as a CSP-safe `<meta name="htmx-config">` tag BEFORE the script — so
 * htmx 2 clients actually swap the framework's 4xx/5xx error fragments
 * (default responseHandling drops them). htmx 4 prescribes no preset.
 */
import { describe, expect, test } from "bun:test";
import { jsx, renderToString } from "../../jsx/src/index";
import { HtmxScript, errorResponseHandlingOf } from "../src/script";
import { htmx2 } from "../src/dialects/v2";
import { htmx4Experimental } from "../src/dialects/v4";

function rendered(
  dialect: Parameters<typeof HtmxScript>[0] extends never
    ? never
    : { dialect?: typeof htmx2; errorSwap?: boolean },
): string {
  return renderToString(
    HtmxScript({
      dialect: dialect.dialect ?? htmx2,
      integrity: null,
      ...(dialect.errorSwap !== undefined
        ? { errorSwap: dialect.errorSwap }
        : {}),
    }),
  );
}

describe("BR-087 HtmxScript error-swap preset", () => {
  test("htmx 2 renders the meta config BEFORE the script tag", () => {
    const html = rendered({ dialect: htmx2 });
    const metaAt = html.indexOf('name="htmx-config"');
    const scriptAt = html.indexOf("<script");
    expect(metaAt).toBeGreaterThanOrEqual(0);
    expect(scriptAt).toBeGreaterThan(metaAt);
  });

  test("the meta content is the dialect preset under responseHandling", () => {
    const html = rendered({ dialect: htmx2 });
    const match = html.match(/content="([^"]*)"/);
    expect(match).not.toBeNull();
    // attribute-escaped quotes decode back to the exact config JSON —
    // an OBJECT (htmx merges it; a bare array would be ignored)
    const json = match![1]!.replaceAll("&quot;", '"');
    const config = JSON.parse(json) as {
      responseHandling: { code: string; swap: boolean }[];
    };
    expect(config.responseHandling.map((r) => r.code)).toEqual([
      "204",
      "[23]..",
      "[45]..",
      "default",
    ]);
    expect(config.responseHandling[2]).toMatchObject({
      swap: true,
      error: true,
    });
  });

  test("errorSwap: false opts out (apps configuring htmx themselves)", () => {
    const html = rendered({ dialect: htmx2, errorSwap: false });
    expect(html).not.toContain('name="htmx-config"');
    expect(html).toContain("<script");
  });

  test("the htmx 4 beta prescribes no preset — script only", () => {
    const html = rendered({ dialect: htmx4Experimental });
    expect(html).not.toContain('name="htmx-config"');
    expect(html).toContain("<script");
  });

  test("CSP posture: nothing inline — no script bodies, only static tags", () => {
    const html = rendered({ dialect: htmx2 });
    // the only script tag is the asset reference with a src
    expect(html).toMatch(/<script [^>]*src=/);
    expect(html).not.toMatch(/<script>[^<]/);
  });

  test("errorResponseHandlingOf reads neutral metadata; htmx 4 yields none", () => {
    const preset = errorResponseHandlingOf(htmx2);
    expect(preset).toBeDefined();
    expect(preset!.length).toBe(4);
    expect(errorResponseHandlingOf(htmx4Experimental)).toBeUndefined();
  });

  test("the preset matches the vendored htmx 2 default shape it amends", () => {
    // same code classes htmx 2 ships by default, with [45].. swap flipped
    const preset = errorResponseHandlingOf(htmx2)!;
    const codes = preset.map((r) => r.code);
    expect(codes).toContain("[23]..");
    expect(codes).toContain("[45]..");
    expect(codes).toContain("default");
    expect(preset.find((r) => r.code === "[45]..")!.swap).toBe(true);
  });

  test("composes as an array child inside a document tree", () => {
    const html = renderToString(
      jsx("div", { children: HtmxScript({ integrity: null }) }),
    );
    expect(html).toContain('name="htmx-config"');
    expect(html).toContain("<script");
  });
});
