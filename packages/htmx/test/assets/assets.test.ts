/**
 * GH-045 HTMX asset registry and local serving contract tests.
 */
import { describe, expect, test } from "bun:test";
import { renderToString } from "@bundar/jsx";
import {
  createHtmxAssetHandler,
  getBundledAsset,
  HtmxScript,
  validateAssetDialectMatch,
  AssetDialectMismatchError,
  AssetRegistryError,
} from "../../src/index";
import { htmx2 } from "../../src/dialects/v2/index";
import { htmx4Experimental } from "../../src/dialects/v4/index";

describe("GH-045 getBundledAsset", () => {
  test("loads htmx2 bundled asset completely offline with verified sha256", () => {
    const asset = getBundledAsset(htmx2);
    expect(asset.version).toBe("2.0.10");
    expect(asset.sha256).toBe(
      "71ea67185bfa8c98c39d31717c6fce5d852370fcdfd129db4543774d3145c0de",
    );
    expect(asset.integrity).toBe(`sha256-${asset.sha256}`);
    expect(asset.bytes.byteLength).toBeGreaterThan(30000);
    expect(asset.text).toContain("htmx");
    expect(asset.descriptor.source).toBe("bundled");
  });

  test("loads htmx4 bundled asset completely offline with verified sha256", () => {
    const asset = getBundledAsset(htmx4Experimental);
    expect(asset.version).toBe("4.0.0-beta6");
    expect(asset.sha256).toBe(
      "28fae7bbe8e8142b702debb9d5234a9a436d9435a4b5165b195aa1a7ed840d25",
    );
    expect(asset.integrity).toBe(`sha256-${asset.sha256}`);
    expect(asset.bytes.byteLength).toBeGreaterThan(20000);
  });

  test("unknown dialect throws AssetRegistryError", () => {
    expect(() => getBundledAsset("unknown-dialect")).toThrow(
      AssetRegistryError,
    );
  });
});

describe("GH-045 validateAssetDialectMatch", () => {
  test("matching versions succeed", () => {
    expect(validateAssetDialectMatch("2.0.10", htmx2).valid).toBe(true);
    expect(
      validateAssetDialectMatch("4.0.0-beta6", htmx4Experimental).valid,
    ).toBe(true);
  });

  test("mismatched versions report failure", () => {
    const mismatch = validateAssetDialectMatch("4.0.0", htmx2);
    expect(mismatch.valid).toBe(false);
    expect(mismatch.reason).toContain("requires a 2.x asset");
  });
});

describe("GH-045 createHtmxAssetHandler", () => {
  test("serves bundled asset with correct headers and status 200", async () => {
    const handler = createHtmxAssetHandler({ dialect: htmx2 });
    const req = new Request("http://localhost/assets/htmx.min.js", {
      method: "GET",
    });
    const res = handler(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe(
      "application/javascript; charset=utf-8",
    );
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(res.headers.get("x-htmx-version")).toBe("2.0.10");
    expect(res.headers.get("etag")).toBe(
      '"71ea67185bfa8c98c39d31717c6fce5d852370fcdfd129db4543774d3145c0de"',
    );
    const body = await res.text();
    expect(body.length).toBeGreaterThan(30000);
  });

  test("returns 304 Not Modified when ETag matches If-None-Match", async () => {
    const handler = createHtmxAssetHandler({ dialect: htmx2 });
    const req = new Request("http://localhost/assets/htmx.min.js", {
      method: "GET",
      headers: {
        "if-none-match":
          '"71ea67185bfa8c98c39d31717c6fce5d852370fcdfd129db4543774d3145c0de"',
      },
    });
    const res = handler(req);
    expect(res.status).toBe(304);
    expect(await res.text()).toBe("");
  });

  test("HEAD request returns headers without body", async () => {
    const handler = createHtmxAssetHandler({ dialect: htmx2 });
    const req = new Request("http://localhost/assets/htmx.min.js", {
      method: "HEAD",
    });
    const res = handler(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe(
      "application/javascript; charset=utf-8",
    );
    expect(await res.text()).toBe("");
  });

  test("disallowed method returns 405 Method Not Allowed", () => {
    const handler = createHtmxAssetHandler({ dialect: htmx2 });
    const req = new Request("http://localhost/assets/htmx.min.js", {
      method: "POST",
    });
    const res = handler(req);
    expect(res.status).toBe(405);
  });

  test("custom asset works without downloading from remote CDN", async () => {
    const handler = createHtmxAssetHandler({
      dialect: htmx2,
      customAsset: 'console.log("custom htmx 2");',
      customVersion: "2.1.0",
    });
    const req = new Request("http://localhost/assets/htmx.min.js");
    const res = handler(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-htmx-version")).toBe("2.1.0");
    expect(await res.text()).toBe('console.log("custom htmx 2");');
  });

  test("mismatched custom asset throws AssetDialectMismatchError", () => {
    expect(() =>
      createHtmxAssetHandler({
        dialect: htmx2,
        customAsset: 'console.log("htmx 4");',
        customVersion: "4.0.0",
      }),
    ).toThrow(AssetDialectMismatchError);
  });
});

describe("GH-045 HtmxScript component", () => {
  test("renders script tag with default htmx2 version, SRI integrity, and data attribute", () => {
    const html = renderToString(HtmxScript());
    expect(html).toContain('src="/assets/htmx.min.js"');
    expect(html).toContain('data-htmx-version="2.0.10"');
    expect(html).toContain(
      'integrity="sha256-71ea67185bfa8c98c39d31717c6fce5d852370fcdfd129db4543774d3145c0de"',
    );
    expect(html).toContain('crossorigin="anonymous"');
    expect(html).toContain("<script");
    expect(html).toContain("defer");
  });

  test("renders htmx4 script tag when dialect is specified", () => {
    const html = renderToString(HtmxScript({ dialect: htmx4Experimental }));
    expect(html).toContain('data-htmx-version="4.0.0-beta6"');
    expect(html).toContain(
      'integrity="sha256-28fae7bbe8e8142b702debb9d5234a9a436d9435a4b5165b195aa1a7ed840d25"',
    );
  });

  test("passes CSP nonce through when provided", () => {
    const html = renderToString(HtmxScript({ nonce: "test-nonce-1234" }));
    expect(html).toContain('nonce="test-nonce-1234"');
  });
});
