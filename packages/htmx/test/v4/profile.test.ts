import { describe, expect, test } from "bun:test";
import {
  htmx4Experimental,
  HTMX4_ASSET_SHA256,
  HTMX4_PROFILE,
  HTMX4_TESTED_VERSION,
} from "../../src/dialects/v4";
import { htmx2 } from "../../src/dialects/v2";
import { isEmulated, isNative, isUnsupported } from "../../src/capabilities";

describe("GH-044 v4 adapter identity and pinning", () => {
  test("identity includes experimental maturity and exact beta version", () => {
    expect(htmx4Experimental.id).toBe("htmx4");
    expect(htmx4Experimental.maturity).toBe("experimental");
    expect(HTMX4_TESTED_VERSION).toBe("4.0.0-beta6");
    expect(htmx4Experimental.supportedRange).toBe(">=4.0.0-beta.0 <4.1.0");
    expect(htmx4Experimental.metadata["htmx4:pinnedVersion"]).toBe(
      "4.0.0-beta6",
    );
  });

  test("asset integrity pinned; beta version never written as GA", () => {
    const asset = htmx4Experimental.describeAsset();
    expect(asset.version).toBe("4.0.0-beta6");
    expect(asset.version).not.toBe("4.0.0");
    expect(asset.integrity).toBe(`sha256-${HTMX4_ASSET_SHA256}`);
    expect(HTMX4_ASSET_SHA256).toMatch(/^[0-9a-f]{64}$/);
  });

  test("profile declares no GA claim and warns revalidation is mandatory", () => {
    expect(HTMX4_PROFILE.gaClaim).toMatch(/no GA/i);
    const serialized = JSON.stringify(HTMX4_PROFILE);
    expect(serialized).toContain("GA revalidation");
  });

  test("every provisional field is annotated", () => {
    const serialized = JSON.stringify(HTMX4_PROFILE);
    expect(serialized).toMatch(/\[provisional\]/);
  });
});

describe("GH-044 beta behavior cannot alter the stable v2 adapter", () => {
  test("v2 remains stable-native after v4 import", () => {
    expect(htmx2.maturity).toBe("stable");
    expect(isNative(htmx2.capabilities, "trigger-after-swap")).toBe(true);
    expect(
      isEmulated(htmx4Experimental.capabilities, "trigger-after-swap"),
    ).toBe(true);
    expect(isUnsupported(htmx4Experimental.capabilities, "cache-control")).toBe(
      true,
    );
    // adapters are separate frozen objects
    expect(htmx2).not.toBe(htmx4Experimental);
    expect(htmx2.capabilities).not.toBe(htmx4Experimental.capabilities);
  });

  test("v4 request decode uses HX-Source alias without touching v2", () => {
    const request = new Request("http://app/x", {
      headers: { "HX-Source": "nav-link" },
    });
    const v4 = htmx4Experimental.decodeRequest(request);
    expect(v4.sourceElement.value).toBe("nav-link");
    // v2 reads HX-Trigger — same request decodes absent under v2
    const v2 = htmx2.decodeRequest(request);
    expect(v2.sourceElement.status).toBe("absent");
  });

  test("both adapters share the neutral directive encoder semantics", () => {
    const directive = { kind: "retarget", selector: "#x" } as const;
    expect(
      htmx4Experimental.encodeResponseDirective(directive).get("HX-Retarget"),
    ).toBe(htmx2.encodeResponseDirective(directive).get("HX-Retarget"));
  });
});

describe("GH-044 migration differences have fixtures or records", () => {
  test("every known difference is recorded with a status", () => {
    expect(HTMX4_PROFILE.migrationDifferences.length).toBeGreaterThanOrEqual(5);
    for (const difference of HTMX4_PROFILE.migrationDifferences) {
      expect(difference.topic).toBeTruthy();
      expect(difference.difference).toBeTruthy();
      expect(difference.status).toMatch(/fixture|record/);
    }
  });

  test("lifecycle evidence reflects GH-008 beta observations", () => {
    expect(HTMX4_PROFILE.lifecycle.observedAfterRequest).toBe(false);
    expect(HTMX4_PROFILE.lifecycle.emulatedEvents).toContain(
      "trigger-after-swap",
    );
  });

  test("inheritance removal and error-swap change are recorded", () => {
    expect(HTMX4_PROFILE.inheritance.attributeInheritance).toBe(false);
    expect(HTMX4_PROFILE.errorBehavior.defaultErrorSwap).toMatch(/none/);
    expect(
      HTMX4_PROFILE.unsupported.some((entry) =>
        entry.includes("cache-control"),
      ),
    ).toBe(true);
  });
});

describe("GH-044 v4 request and response mapping", () => {
  test("request headers including HX-Source decode into normalized metadata", () => {
    const meta = htmx4Experimental.decodeRequest(
      new Request("http://app/items", {
        headers: {
          "HX-Request": "true",
          "HX-Source": "btn",
          "HX-Target": "#list",
          "HX-Current-URL": "http://app/page",
        },
      }),
    );
    expect(meta.isHtmx).toBe(true);
    expect(meta.sourceElement.value).toBe("btn");
    expect(meta.target.value).toBe("#list");
    expect(meta.currentUrl.value?.href).toBe("http://app/page");
  });

  test("response directives encode identically to the neutral encoder", () => {
    const headers = htmx4Experimental.encodeResponseDirective({
      kind: "trigger",
      events: [{ name: "saved", detail: { ok: true } }],
    });
    expect(headers.get("HX-Trigger")).toBe('{"saved":{"ok":true}}');
  });

  test("diagnostics mark emulated/unsupported with GA warnings", () => {
    expect(htmx4Experimental.diagnose("cache-control").message).toMatch(/GA/);
    expect(htmx4Experimental.diagnose("trigger-after-swap").message).toMatch(
      /GA revalidation/,
    );
  });
});
