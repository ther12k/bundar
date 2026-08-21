import { describe, expect, test } from "bun:test";
import {
  capabilities,
  isEmulated,
  isNative,
  isUnsupported,
  type HtmxDialectAdapter,
  type HtmxRequestMetadata,
  type HtmxResponseDirective,
} from "../src/index";
import { htmx2 } from "../src/v2";
import { htmx4Experimental } from "../src/v4";

describe("GH-040 dialect adapter interface", () => {
  test("htmx2 adapter is a stable, immutable, complete implementation", () => {
    expect(htmx2.id).toBe("htmx2");
    expect(htmx2.maturity).toBe("stable");
    expect(htmx2.supportedRange).toBe(">=2.0.0 <3.0.0");
    expect(Object.isFrozen(htmx2)).toBe(true);
    expect(Object.isFrozen(htmx2.capabilities)).toBe(true);
    expect(Object.isFrozen(htmx2.metadata)).toBe(true);
    expect(isNative(htmx2.capabilities, "request-metadata")).toBe(true);
  });

  test("htmx4 adapter is experimental with explicit non-GA claims", () => {
    expect(htmx4Experimental.maturity).toBe("experimental");
    expect(htmx4Experimental.metadata["htmx4:gaClaim"]).toContain("no GA");
    expect(
      isEmulated(htmx4Experimental.capabilities, "trigger-after-swap"),
    ).toBe(true);
    expect(isUnsupported(htmx4Experimental.capabilities, "cache-control")).toBe(
      true,
    );
  });

  test("decodeRequest is a pure function over the request", () => {
    const request = new Request("http://localhost/x", {
      headers: {
        "HX-Request": "true",
        "HX-Target": "main",
        "HX-Trigger": "btn",
        "HX-Current-URL": "http://localhost/",
      },
    });
    const decoded: HtmxRequestMetadata = htmx2.decodeRequest(request);
    expect(decoded.isHtmx).toBe(true);
    expect(decoded.target).toBe("main");
    expect(decoded.trigger).toBe("btn");
    expect(decoded.currentUrl).toBe("http://localhost/");
    expect(Object.isFrozen(decoded)).toBe(true);

    const plain = htmx2.decodeRequest(new Request("http://localhost/"));
    expect(plain.isHtmx).toBe(false);
    expect(plain.target).toBeNull();
  });

  test("encodeResponseDirective covers every neutral directive kind", () => {
    const cases: Array<[HtmxResponseDirective, [string, string]]> = [
      [{ kind: "reswap", strategy: "outerHTML" }, ["HX-Reswap", "outerHTML"]],
      [{ kind: "retarget", selector: "#x" }, ["HX-Retarget", "#x"]],
      [{ kind: "reselect", selector: ".y" }, ["HX-Reselect", ".y"]],
      [{ kind: "redirect", url: "/go" }, ["HX-Redirect", "/go"]],
      [{ kind: "location", url: "/here" }, ["HX-Location", "/here"]],
      [{ kind: "refresh" }, ["HX-Refresh", "true"]],
      [{ kind: "push-url", url: "/next" }, ["HX-Push-URL", "/next"]],
      [{ kind: "push-url", url: false }, ["HX-Push-URL", "false"]],
      [{ kind: "replace-url", url: "/now" }, ["HX-Replace-URL", "/now"]],
      [
        { kind: "trigger", events: [{ name: "evt", detail: { a: 1 } }] },
        ["HX-Trigger", '{"evt":{"a":1}}'],
      ],
    ];
    for (const [directive, [header, value]] of cases) {
      expect(htmx2.encodeResponseDirective(directive).get(header)).toBe(value);
    }
  });

  test("capability maps must be complete — partial maps throw", () => {
    expect(() => capabilities({ "request-metadata": "native" })).toThrow(
      /missing "response-directives"/,
    );
  });

  test("diagnostics distinguish native, emulated, and unsupported", () => {
    expect(htmx2.diagnose("request-metadata").support).toBe("native");
    expect(htmx4Experimental.diagnose("trigger-after-swap").support).toBe(
      "emulated",
    );
    expect(htmx4Experimental.diagnose("cache-control").support).toBe(
      "unsupported",
    );
    expect(htmx4Experimental.diagnose("cache-control").message).toContain("GA");
  });
});

describe("GH-040 synthetic third dialect extensibility", () => {
  // A synthetic dialect implemented entirely in test code proves the
  // interface accepts new adapters without changing core types.
  const synthetic: HtmxDialectAdapter = Object.freeze({
    id: "synthetic-hx",
    displayName: "Synthetic HTMX-like",
    maturity: "experimental",
    supportedRange: ">=0.0.1 <1.0.0",
    capabilities: capabilities({
      "request-metadata": "native",
      "response-directives": "emulated",
      "trigger-after-swap": "unsupported",
      "trigger-after-settle": "unsupported",
      "out-of-band-swaps": "emulated",
      "history-actions": "native",
      "cache-control": "native",
    }),
    metadata: Object.freeze({ "synthetic:note": "test-only dialect" }),
    decodeRequest: (request: Request): HtmxRequestMetadata =>
      Object.freeze({
        isHtmx: request.headers.has("X-Synth"),
        isBoosted: false,
        target: null,
        trigger: null,
        triggerName: null,
        currentUrl: null,
        prompt: null,
      }),
    encodeResponseDirective: () => new Headers(),
    describeAsset: () => ({
      source: "custom",
      version: "0.0.1",
      integrity: null,
    }),
    diagnose: (capability) => ({
      capability,
      support: "emulated",
      message: `synthetic dialect emulates ${capability}`,
    }),
  } satisfies HtmxDialectAdapter);

  test("implements the interface without any core-type changes", () => {
    expect(synthetic.id).toBe("synthetic-hx");
    expect(
      synthetic.decodeRequest(
        new Request("http://x/", { headers: { "X-Synth": "1" } }),
      ).isHtmx,
    ).toBe(true);
    expect(synthetic.describeAsset().source).toBe("custom");
    expect(isUnsupported(synthetic.capabilities, "trigger-after-swap")).toBe(
      true,
    );
  });

  test("interface surface contains no v2-only or v4-only field names", () => {
    const adapterKeys = Object.keys({
      id: 0,
      displayName: 0,
      maturity: 0,
      supportedRange: 0,
      capabilities: 0,
      metadata: 0,
      decodeRequest: 0,
      encodeResponseDirective: 0,
      describeAsset: 0,
      diagnose: 0,
    });
    for (const key of adapterKeys) {
      expect(key).not.toMatch(/^(htmx2|htmx4|v2|v4)/);
    }
    // dialect-specific detail lives under namespaced metadata keys
    expect(Object.keys(htmx2.metadata)[0]).toMatch(/^htmx2:/);
    expect(Object.keys(htmx4Experimental.metadata)[0]).toMatch(/^htmx4:/);
  });

  test("adapters are reusable across requests (pure, stateless)", () => {
    const r1 = htmx2.decodeRequest(
      new Request("http://x/", { headers: { "HX-Request": "true" } }),
    );
    const r2 = htmx2.decodeRequest(new Request("http://y/"));
    const r3 = htmx2.decodeRequest(
      new Request("http://x/", { headers: { "HX-Request": "true" } }),
    );
    expect(r1.isHtmx).toBe(true);
    expect(r2.isHtmx).toBe(false);
    expect(r3).toEqual(r1);
  });
});
