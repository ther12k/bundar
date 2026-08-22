/**
 * Extension compatibility and registration helpers (GH-047).
 *
 * Provides structured descriptors and migration diagnostics for official
 * extensions (such as sse, ws, json-enc, morphdom, response-targets) and the
 * official htmx-2-compat migration reference extension.
 */
import type { CapabilitySupport, HtmxDialectAdapter } from "./dialect";
import { htmx2 } from "./dialects/v2/index";

export interface HtmxExtensionDescriptor {
  readonly name: string;
  readonly description: string;
  readonly dialectSupport: Readonly<Record<string, CapabilitySupport>>;
  readonly migrationNote?: string;
}

export class ExtensionPolicyError extends Error {
  public constructor(detail: string) {
    super(`extension policy: ${detail}`);
    this.name = "ExtensionPolicyError";
  }
}

/** Official htmx-2-compat extension descriptor for migration reference. */
export const HTMX_2_COMPAT_EXTENSION: HtmxExtensionDescriptor = Object.freeze({
  name: "htmx-2-compat",
  description:
    "Temporary migration reference extension providing htmx 2 compatibility layer in htmx 4",
  dialectSupport: Object.freeze({
    htmx2: "unsupported",
    htmx4: "emulated",
  }),
  migrationNote:
    "Use only during migration testing; remove before production alpha release",
});

/** Well-known official HTMX extensions. */
export const OFFICIAL_EXTENSIONS: Readonly<
  Record<string, HtmxExtensionDescriptor>
> = Object.freeze({
  "htmx-2-compat": HTMX_2_COMPAT_EXTENSION,
  sse: Object.freeze({
    name: "sse",
    description: "Server Sent Events support extension",
    dialectSupport: Object.freeze({
      htmx2: "native",
      htmx4: "emulated",
    }),
    migrationNote: "htmx 4 moves SSE to core plugin architecture",
  }),
  ws: Object.freeze({
    name: "ws",
    description: "WebSockets support extension",
    dialectSupport: Object.freeze({
      htmx2: "native",
      htmx4: "emulated",
    }),
  }),
  "json-enc": Object.freeze({
    name: "json-enc",
    description: "Encodes form submissions as JSON body",
    dialectSupport: Object.freeze({
      htmx2: "native",
      htmx4: "unsupported",
    }),
    migrationNote: "JSON encoding is unsupported in htmx 4 by default",
  }),
  "response-targets": Object.freeze({
    name: "response-targets",
    description:
      "Configures distinct target elements for HTTP error status codes",
    dialectSupport: Object.freeze({
      htmx2: "native",
      htmx4: "unsupported",
    }),
    migrationNote: "htmx 4 incorporates target status mapping into core",
  }),
  morphdom: Object.freeze({
    name: "morphdom",
    description: "DOM morphing swap extension",
    dialectSupport: Object.freeze({
      htmx2: "native",
      htmx4: "emulated",
    }),
  }),
});

/** Escape hatch for custom or third-party extensions. */
export interface RawExtension {
  readonly kind: "raw-extension";
  readonly name: string;
}

export function rawExtension(name: string): RawExtension {
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new ExtensionPolicyError("extension name must be a non-empty string");
  }
  return Object.freeze({
    kind: "raw-extension",
    name: name.trim(),
  });
}

/** Formats an `hx-ext` attribute value from a list of extension names/descriptors. */
export function formatExtensionAttribute(
  extensions: ReadonlyArray<string | HtmxExtensionDescriptor | RawExtension>,
): string {
  if (extensions.length === 0) {
    throw new ExtensionPolicyError("extension list must not be empty");
  }
  const names = extensions.map((ext) => {
    if (typeof ext === "string") return ext.trim();
    if ("kind" in ext && ext.kind === "raw-extension") return ext.name;
    return ext.name;
  });
  return names.filter((n) => n.length > 0).join(",");
}

export interface ExtensionDiagnostic {
  readonly extension: string;
  readonly support: CapabilitySupport;
  readonly dialect: string;
  readonly isOfficial: boolean;
  readonly migrationNote?: string;
}

/**
 * Diagnoses whether an extension is supported or deprecated in a given dialect.
 */
export function diagnoseExtension(
  extension: string | HtmxExtensionDescriptor | RawExtension,
  dialect: HtmxDialectAdapter = htmx2,
): ExtensionDiagnostic {
  const name =
    typeof extension === "string" ? extension.trim() : extension.name;

  const official = OFFICIAL_EXTENSIONS[name];
  if (official === undefined) {
    return Object.freeze({
      extension: name,
      support: "emulated",
      dialect: dialect.id,
      isOfficial: false,
      migrationNote:
        "third-party or custom extension; compatibility unverified by dialect",
    });
  }

  const support = official.dialectSupport[dialect.id] ?? "unsupported";
  return Object.freeze({
    extension: name,
    support,
    dialect: dialect.id,
    isOfficial: true,
    migrationNote: official.migrationNote,
  });
}
