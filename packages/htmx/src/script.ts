/**
 * HtmxScript helper component (GH-045).
 *
 * Renders the `<script>` tag pointing to the configured local HTMX asset
 * with explicit version metadata, SRI integrity hashes, and CSP nonce support.
 * Does not emit unreviewed third-party CDN URLs.
 */
import { jsx, type JSXChild } from "@bundar/jsx";
import type { HtmxDialectAdapter } from "./dialect";
import { getBundledAsset } from "./assets";
import { htmx2 } from "./dialects/v2/index";

export interface HtmxScriptProps {
  /** Dialect adapter providing the default version and integrity. Defaults to htmx2. */
  readonly dialect?: HtmxDialectAdapter;
  /** Script src path on the local server. Defaults to "/assets/htmx.min.js". */
  readonly src?: string;
  /** CSP nonce for inline/external script allowance. */
  readonly nonce?: string;
  /** Explicit SRI integrity hash. Omit to use the pinned dialect integrity, or pass null to omit. */
  readonly integrity?: string | null;
  /** Cross-origin policy for SRI. Defaults to "anonymous" when integrity is present. */
  readonly crossOrigin?: "anonymous" | "use-credentials";
  /** Whether the script should defer execution. Defaults to true. */
  readonly defer?: boolean;
  /**
   * Render the dialect's error-swap preset (htmx 2) as a CSP-safe
   * `<meta name="htmx-config">` before the script. Defaults to true;
   * pass false only when the application configures htmx itself.
   */
  readonly errorSwap?: boolean;
  /** Custom data-attributes or script attributes. */
  readonly attributes?: Readonly<Record<string, string | boolean>>;
}

/** One htmx responseHandling rule a dialect may prescribe for clients. */
export interface ErrorResponseHandlingRule {
  readonly code: string;
  readonly swap: boolean;
  readonly error?: boolean;
}

/**
 * Reads the dialect-owned error-swap preset (neutral metadata key; only
 * dialects whose clients need it carry one — htmx 2 today).
 */
export function errorResponseHandlingOf(
  dialect: HtmxDialectAdapter,
): readonly ErrorResponseHandlingRule[] | undefined {
  const raw = dialect.metadata["errorResponseHandling"];
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw))
    throw new Error("dialect metadata errorResponseHandling must be an array");
  return raw as readonly ErrorResponseHandlingRule[];
}

/**
 * Renders an accessible, secure `<script>` tag for the local HTMX asset.
 * Includes data-htmx-version for deterministic inspection and SRI integrity.
 *
 * BR-087: when the dialect prescribes a client error-swap preset (htmx 2),
 * a `<meta name="htmx-config">` tag is rendered BEFORE the script so
 * enhanced 4xx/5xx error fragments actually swap — configured through a
 * static meta tag, never an inline script, so CSP nonce/strict-dynamic
 * policies are unaffected. Pass `errorSwap: false` when the application
 * configures htmx itself.
 */
export function HtmxScript({
  dialect = htmx2,
  src = "/assets/htmx.min.js",
  nonce,
  integrity,
  crossOrigin,
  defer = true,
  errorSwap = true,
  attributes = {},
}: HtmxScriptProps = {}): JSXChild {
  const asset = getBundledAsset(dialect);
  const effectiveIntegrity =
    integrity === null
      ? undefined
      : (integrity ?? asset.descriptor.integrity ?? undefined);
  const effectiveCrossOrigin =
    crossOrigin ?? (effectiveIntegrity !== undefined ? "anonymous" : undefined);

  const script = jsx("script", {
    src,
    defer,
    "data-htmx-version": asset.version,
    ...(effectiveIntegrity ? { integrity: effectiveIntegrity } : {}),
    ...(effectiveCrossOrigin ? { crossorigin: effectiveCrossOrigin } : {}),
    ...(nonce ? { nonce } : {}),
    ...attributes,
  });

  const preset = errorSwap ? errorResponseHandlingOf(dialect) : undefined;
  if (preset === undefined) return script;
  // htmx-config content is a config OBJECT — the preset rides under the
  // responseHandling key (a bare array would be ignored by the merge).
  const config = jsx("meta", {
    name: "htmx-config",
    content: JSON.stringify({ responseHandling: preset }),
  });
  // meta must precede the script: htmx reads meta config at load time.
  return [config, script];
}
