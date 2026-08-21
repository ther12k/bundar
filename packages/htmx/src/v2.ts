/**
 * HTMX 2 stable dialect adapter.
 * Pinned to htmx 2.0.10 (SHA-256 captured in evidence/gh-008).
 */
import type { HtmxDialect } from "./neutral";

export const htmx2: HtmxDialect = Object.freeze({
  version: "htmx2" as const,
  experimental: false,
  pinnedVersion: "2.0.10",
});
