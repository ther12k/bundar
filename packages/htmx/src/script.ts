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
  /** Custom data-attributes or script attributes. */
  readonly attributes?: Readonly<Record<string, string | boolean>>;
}

/**
 * Renders an accessible, secure `<script>` tag for the local HTMX asset.
 * Includes data-htmx-version for deterministic inspection and SRI integrity.
 */
export function HtmxScript({
  dialect = htmx2,
  src = "/assets/htmx.min.js",
  nonce,
  integrity,
  crossOrigin,
  defer = true,
  attributes = {},
}: HtmxScriptProps = {}): JSXChild {
  const asset = getBundledAsset(dialect);
  const effectiveIntegrity =
    integrity === null
      ? undefined
      : (integrity ?? asset.descriptor.integrity ?? undefined);
  const effectiveCrossOrigin =
    crossOrigin ?? (effectiveIntegrity !== undefined ? "anonymous" : undefined);

  return jsx("script", {
    src,
    defer,
    "data-htmx-version": asset.version,
    ...(effectiveIntegrity ? { integrity: effectiveIntegrity } : {}),
    ...(effectiveCrossOrigin ? { crossorigin: effectiveCrossOrigin } : {}),
    ...(nonce ? { nonce } : {}),
    ...attributes,
  });
}
