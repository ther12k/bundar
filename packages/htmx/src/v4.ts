/**
 * HTMX 4 EXPERIMENTAL dialect adapter.
 *
 * htmx 4 is NOT GA. This adapter is version-pinned to 4.0.0-beta6 and must
 * not be used in production. All exports carry the word "experimental" in
 * this file header and in the adapter descriptor.
 *
 * When htmx 4 reaches GA, GH-089–GH-096 gates must be passed before this
 * adapter can be promoted to stable.
 */
import type { HtmxDialect } from "./neutral";

export const htmx4Experimental: HtmxDialect = Object.freeze({
  version: "htmx4" as const,
  experimental: true,
  pinnedVersion: "4.0.0-beta6",
});
