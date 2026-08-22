/**
 * GH-047 extension compatibility tests.
 */
import { describe, expect, test } from "bun:test";
import {
  diagnoseExtension,
  formatExtensionAttribute,
  rawExtension,
  ExtensionPolicyError,
  HTMX_2_COMPAT_EXTENSION,
  OFFICIAL_EXTENSIONS,
} from "../../src/index";
import { htmx2 } from "../../src/dialects/v2/index";
import { htmx4Experimental } from "../../src/dialects/v4/index";

describe("GH-047 formatExtensionAttribute", () => {
  test("formats official and raw extension names into hx-ext string", () => {
    expect(formatExtensionAttribute(["sse", "ws"])).toBe("sse,ws");
    expect(formatExtensionAttribute([HTMX_2_COMPAT_EXTENSION])).toBe(
      "htmx-2-compat",
    );
    expect(
      formatExtensionAttribute([
        "sse",
        rawExtension("custom-ext"),
        OFFICIAL_EXTENSIONS["morphdom"]!,
      ]),
    ).toBe("sse,custom-ext,morphdom");
  });

  test("rejects empty extension lists", () => {
    expect(() => formatExtensionAttribute([])).toThrow(ExtensionPolicyError);
  });
});

describe("GH-047 diagnoseExtension", () => {
  test("identifies native support in htmx 2", () => {
    const sseDiag = diagnoseExtension("sse", htmx2);
    expect(sseDiag.support).toBe("native");
    expect(sseDiag.isOfficial).toBe(true);

    const jsonDiag = diagnoseExtension("json-enc", htmx2);
    expect(jsonDiag.support).toBe("native");
  });

  test("identifies migration notes and unsupported status in htmx 4 beta", () => {
    const jsonDiag = diagnoseExtension("json-enc", htmx4Experimental);
    expect(jsonDiag.support).toBe("unsupported");
    expect(jsonDiag.migrationNote).toContain("JSON encoding is unsupported");

    const compatDiag = diagnoseExtension(
      HTMX_2_COMPAT_EXTENSION,
      htmx4Experimental,
    );
    expect(compatDiag.support).toBe("emulated");
    expect(compatDiag.migrationNote).toContain("migration testing");
  });

  test("diagnoses custom third-party extensions as unverified", () => {
    const customDiag = diagnoseExtension("my-org-auth-ext", htmx2);
    expect(customDiag.isOfficial).toBe(false);
    expect(customDiag.migrationNote).toContain("third-party or custom");
  });
});

describe("GH-047 rawExtension escape hatch", () => {
  test("wraps extension names and rejects empty values", () => {
    const raw = rawExtension("custom-sse");
    expect(raw.kind).toBe("raw-extension");
    expect(raw.name).toBe("custom-sse");

    expect(() => rawExtension("")).toThrow(ExtensionPolicyError);
    expect(() => rawExtension("   ")).toThrow(ExtensionPolicyError);
  });
});
