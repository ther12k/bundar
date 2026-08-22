/**
 * Migration-audit rule definitions (GH-078), grounded in the pinned
 * dialect profiles exported by @bundar/htmx — header aliases, event
 * mapping tables, the htmx 2 inherited-attribute set, official-extension
 * dialect support, and the error-swap divergence. Rules classify as
 * blocking / review / informational / escape-hatch; each carries
 * migration guidance.
 */
import {
  getEventMappingTable,
  HTMX2_INHERITED_ATTRIBUTES,
  OFFICIAL_EXTENSIONS,
} from "@bundar/htmx";
import { htmx2 } from "@bundar/htmx/2";
import { htmx4Experimental } from "@bundar/htmx/4";

export type AuditSeverity = "blocking" | "review" | "informational";

export interface AuditRule {
  readonly id: string;
  readonly severity: AuditSeverity;
  /** What changed between htmx 2 and the htmx 4 beta. */
  readonly change: string;
  readonly guidance: string;
  /** Regex over a single source line (TS/TSX/HTML/JSON). */
  readonly pattern: RegExp;
}

const v4Events = getEventMappingTable(htmx4Experimental);
const v2Events = getEventMappingTable(htmx2);

/** Events whose v4 mapping is approximate (divergent, provisional). */
const APPROXIMATE_EVENTS = v4Events
  .filter((mapping) => mapping.mapping === "approximate")
  .map((mapping) => mapping.rawName);

/** Inherited attributes whose v2 implicit inheritance semantics changed. */
const INHERITED = [...HTMX2_INHERITED_ATTRIBUTES];

/** Extensions whose v4 support is not native. */
const NON_NATIVE_EXTENSIONS = Object.entries(OFFICIAL_EXTENSIONS)
  .filter(([, descriptor]) => descriptor.dialectSupport.htmx4 !== "native")
  .map(([name, descriptor]) => ({
    name,
    support: descriptor.dialectSupport.htmx4,
    note: descriptor.migrationNote ?? "",
  }));
const UNSUPPORTED_EXTENSIONS = NON_NATIVE_EXTENSIONS.filter(
  (extension) => extension.support === "unsupported",
);

/**
 * Header renames derived from the v4 adapter's metadata — raw header
 * names live only inside @bundar/htmx (ADR-0016 raw-htmx-surface).
 */
const V4_HEADER_ALIASES = Object.entries(
  (htmx4Experimental.metadata as Record<string, unknown>)[
    "requestHeaderAliases"
  ] as Record<string, string>,
);

const headerRenameRules: readonly AuditRule[] = V4_HEADER_ALIASES.map(
  ([canonical, alias]) => ({
    id: `header-rename:${canonical}`,
    severity: "blocking" as const,
    change: `the htmx 4 beta sends the v2 header ${canonical} as ${alias}`,
    guidance:
      "Build request headers with buildHtmxRequestHeaders (dialect-aliased) instead of hand-written header names",
    pattern: new RegExp(`["'\\\`]${canonical}["'\\\`]`),
  }),
);

export const AUDIT_RULES: readonly AuditRule[] = [
  ...headerRenameRules,
  ...APPROXIMATE_EVENTS.map<AuditRule>((rawName) => ({
    id: `event-approximate:${rawName ?? "unknown"}`,
    severity: "review",
    change: `the ${rawName} mapping in htmx 4 beta is approximate [provisional]`,
    guidance: `Use resolveDialectEvent/createApplicationEvent instead of the raw ${rawName} name`,
    pattern: new RegExp(
      `["'\`]${(rawName ?? "").replace(/[:]/g, "\\:")}["'\`]`,
    ),
  })),
  {
    id: "implicit-inheritance",
    severity: "review",
    change: `htmx 4 changes implicit inheritance for the v2 inherited set (${INHERITED.slice(0, 4).join(", ")}…)`,
    guidance:
      "Run diagnoseInheritance and set explicit hx-inherit where you rely on inheritance",
    pattern: new RegExp(`\\b(?:${INHERITED.join("|")})\\b`),
  },
  ...NON_NATIVE_EXTENSIONS.map<AuditRule>((extension) => ({
    id: `extension-compat:${extension.name}`,
    severity:
      extension.support === "unsupported"
        ? ("blocking" as const)
        : ("review" as const),
    change: `the ${extension.name} extension is ${extension.support} in htmx 4 beta${extension.note ? ` — ${extension.note}` : ""}`,
    guidance:
      extension.support === "unsupported"
        ? `Remove or replace the ${extension.name} extension before switching dialects`
        : `Verify ${extension.name} behavior under htmx 4 (emulated) during migration`,
    pattern: new RegExp(`hx-ext=["'\\\`][^"'\\\`]*\\b${extension.name}\\b`),
  })),
  {
    id: "error-swap-assumption",
    severity: "review",
    change:
      "htmx 2 swaps error-status responses into the target by default; the htmx 4 beta does not (errorSwapMode)",
    guidance:
      "Use errorViewResponse so error delivery is negotiated per dialect; suppress with a comment if verified",
    pattern: /status:\s*[45]\d\d/,
  },
  {
    id: "history-assumption",
    severity: "review",
    change: "htmx 4 reworks history cache internals [provisional]",
    guidance:
      "Prefer htmxRedirect/htmxLocation/composeNavigation over direct history manipulation",
    pattern: /\b(?:hx-push-url|htmx\.history|historyRestore)\b/,
  },
  {
    id: "cdn-script",
    severity: "review",
    change:
      "CDN-loaded htmx bypasses the pinned dialect assets and integrity registry",
    guidance:
      "Serve the local pinned asset via createHtmxAssetHandler and HtmxScript",
    pattern: /<script[^>]+(?:unpkg|jsdelivr|cdn\.)[^>]*htmx/,
  },
  {
    id: "asset-pin",
    severity: "informational",
    change:
      "version-pinned htmx references must match the dialect's pinned profile",
    guidance:
      "Prefer the asset registry (describeAsset/HtmxScript); verify any manual pin",
    pattern: /htmx[@-](?:2|4)\.\d[\w.-]*|htmx\.min\.js/i,
  },
  {
    id: "raw-adapter-escape",
    severity: "review",
    change:
      "raw adapter escapes (rawDialectEvent/rawExtension/dialect.id checks) bypass neutral mappings",
    guidance:
      "Audit every escape hatch; carry its approximate-mapping diagnostics",
    pattern:
      /\b(?:rawDialectEvent|rawExtension)\b|(?:dialect|adapter)\.id\s*===|(?:dialect|adapter)\.metadata\[/,
  },
];

export const RULES_BY_ID: ReadonlyMap<string, AuditRule> = new Map(
  AUDIT_RULES.map((rule) => [rule.id, rule]),
);

export function severityRank(severity: AuditSeverity): number {
  return severity === "blocking" ? 3 : severity === "review" ? 2 : 1;
}

export const AUDIT_DATA = Object.freeze({
  approximateEvents: Object.freeze(APPROXIMATE_EVENTS),
  inheritedAttributes: Object.freeze(INHERITED),
  nonNativeExtensions: Object.freeze(NON_NATIVE_EXTENSIONS),
  unsupportedExtensions: Object.freeze(
    UNSUPPORTED_EXTENSIONS.map((e) => e.name),
  ),
  v2EventNames: Object.freeze(v2Events.map((mapping) => mapping.rawName)),
});
