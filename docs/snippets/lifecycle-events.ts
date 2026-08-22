/**
 * Runnable snippet: lifecycle events through the neutral API (GH-046).
 * Verified in CI by tests/docs/snippets.test.ts.
 */
import { getEventMappingTable, resolveDialectEvent } from "@bundar/htmx";
import { htmx2 } from "@bundar/htmx/2";

export const mappings = getEventMappingTable(htmx2);
export const afterSwap = resolveDialectEvent("after-swap", htmx2);
if (afterSwap.rawName !== "htmx:afterSwap") {
  throw new Error("snippet lifecycle-events: unexpected mapping");
}
