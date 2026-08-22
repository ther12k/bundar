/**
 * HTMX asset registry and local serving contract (GH-045).
 *
 * Applications can serve an explicitly pinned official htmx asset locally or
 * supply their own asset without a hidden CDN dependency.
 *
 * Serving modes:
 * - Bundled: uses the verified, SHA-256-pinned local assets (htmx 2.0.10 stable
 *   or htmx 4.0.0-beta6 experimental). No runtime network downloads.
 * - Custom: user-supplied asset bytes with explicit version and integrity.
 *
 * Local asset handlers include:
 * - Content-Type: application/javascript; charset=utf-8
 * - ETag matching asset SHA-256 with 304 Not Modified on If-None-Match
 * - Cache-Control: public, max-age=31536000, immutable
 * - Asset vs dialect mismatch detection in development and test suites.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { HtmxAssetDescriptor, HtmxDialectAdapter } from "./dialect";
import { htmx2 } from "./dialects/v2/index";
import { htmx4Experimental } from "./dialects/v4/index";

export class AssetRegistryError extends Error {
  public constructor(detail: string) {
    super(`asset registry: ${detail}`);
    this.name = "AssetRegistryError";
  }
}

export class AssetDialectMismatchError extends Error {
  public constructor(assetVersion: string, dialectId: string, detail: string) {
    super(
      `asset dialect mismatch: asset version "${assetVersion}" is incompatible with dialect "${dialectId}" (${detail})`,
    );
    this.name = "AssetDialectMismatchError";
  }
}

export interface HtmxAsset {
  readonly version: string;
  readonly integrity: string;
  readonly sha256: string;
  readonly bytes: Uint8Array;
  readonly text: string;
  readonly descriptor: HtmxAssetDescriptor;
}

// Lazy cache for loaded vendor assets
const assetCache = new Map<string, HtmxAsset>();

function loadVendorAsset(
  filename: string,
  version: string,
  expectedSha256: string,
): HtmxAsset {
  const cached = assetCache.get(version);
  if (cached !== undefined) return cached;

  const path = join(import.meta.dir, "vendor", filename);
  const bytes = new Uint8Array(readFileSync(path));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== expectedSha256) {
    throw new AssetRegistryError(
      `asset checksum mismatch for ${filename}: expected ${expectedSha256}, got ${sha256}`,
    );
  }
  const text = new TextDecoder("utf-8").decode(bytes);
  const integrity = `sha256-${sha256}`;
  const asset: HtmxAsset = Object.freeze({
    version,
    integrity,
    sha256,
    bytes,
    text,
    descriptor: Object.freeze({
      source: "bundled",
      version,
      integrity,
    }),
  });
  assetCache.set(version, asset);
  return asset;
}

/**
 * Loads the pinned bundled asset for a given dialect adapter or dialect ID.
 * Works completely offline with zero runtime network calls.
 */
export function getBundledAsset(
  dialectOrId: HtmxDialectAdapter | string = htmx2,
): HtmxAsset {
  const id = typeof dialectOrId === "string" ? dialectOrId : dialectOrId.id;
  if (id === "htmx2" || id === "2" || id === "2.0.10") {
    return loadVendorAsset(
      "htmx2.min.js",
      "2.0.10",
      "71ea67185bfa8c98c39d31717c6fce5d852370fcdfd129db4543774d3145c0de",
    );
  }
  if (id === "htmx4" || id === "4" || id === "4.0.0-beta6") {
    return loadVendorAsset(
      "htmx4.min.js",
      "4.0.0-beta6",
      "28fae7bbe8e8142b702debb9d5234a9a436d9435a4b5165b195aa1a7ed840d25",
    );
  }
  throw new AssetRegistryError(`unknown dialect asset identifier: "${id}"`);
}

/**
 * Validates that an asset version matches the dialect adapter's major version.
 */
export function validateAssetDialectMatch(
  assetVersion: string,
  dialect: HtmxDialectAdapter,
): { valid: boolean; reason?: string } {
  const assetMajor = assetVersion.split(".")[0];
  if (dialect.id === "htmx2" && assetMajor !== "2") {
    return {
      valid: false,
      reason: `dialect htmx2 requires a 2.x asset, but got version ${assetVersion}`,
    };
  }
  if (dialect.id === "htmx4" && assetMajor !== "4") {
    return {
      valid: false,
      reason: `dialect htmx4 requires a 4.x asset, but got version ${assetVersion}`,
    };
  }
  return { valid: true };
}

export interface CreateHtmxAssetHandlerOptions {
  /** Dialect adapter for the bundled asset. Defaults to htmx2. */
  readonly dialect?: HtmxDialectAdapter;
  /** Custom asset bytes or text to serve instead of the bundled version. */
  readonly customAsset?: Uint8Array | string;
  /** Custom asset version for mismatch detection and data attributes. */
  readonly customVersion?: string;
  /** Custom asset integrity string (e.g. "sha256-..."). Computed if omitted. */
  readonly customIntegrity?: string;
  /** Cache-Control header value. Defaults to immutable 1-year cache. */
  readonly cacheControl?: string;
}

const DEFAULT_CACHE_CONTROL = "public, max-age=31536000, immutable";

/**
 * Creates an HTTP request handler that serves the configured HTMX asset locally.
 * Includes ETag (SHA-256), 304 Not Modified, Cache-Control, and Content-Type.
 */
export function createHtmxAssetHandler(
  options: CreateHtmxAssetHandlerOptions = {},
): (request: Request) => Response {
  const dialect = options.dialect ?? htmx2;
  let bytes: Uint8Array;
  let version: string;
  let sha256: string;

  if (options.customAsset !== undefined) {
    bytes =
      typeof options.customAsset === "string"
        ? new TextEncoder().encode(options.customAsset)
        : options.customAsset;
    version = options.customVersion ?? "custom";
    sha256 = createHash("sha256").update(bytes).digest("hex");

    if (options.customVersion !== undefined) {
      const match = validateAssetDialectMatch(options.customVersion, dialect);
      if (!match.valid) {
        throw new AssetDialectMismatchError(
          options.customVersion,
          dialect.id,
          match.reason!,
        );
      }
    }
  } else {
    const bundled = getBundledAsset(dialect);
    bytes = bundled.bytes;
    version = bundled.version;

    sha256 = bundled.sha256;
  }

  const cacheControl = options.cacheControl ?? DEFAULT_CACHE_CONTROL;
  const etag = `"${sha256}"`;

  return (request: Request): Response => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: {
          allow: "GET, HEAD",
          "content-type": "text/plain; charset=utf-8",
        },
      });
    }

    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch === etag || ifNoneMatch === `W/${etag}`) {
      return new Response(null, {
        status: 304,
        headers: {
          etag,
          "cache-control": cacheControl,
          "x-htmx-version": version,
        },
      });
    }

    return new Response(request.method === "HEAD" ? null : (bytes as never), {
      status: 200,
      headers: {
        "content-type": "application/javascript; charset=utf-8",
        "content-length": String(bytes.byteLength),
        etag,
        "cache-control": cacheControl,
        "x-htmx-version": version,
        vary: "Accept-Encoding",
      },
    });
  };
}

export { htmx2, htmx4Experimental };
