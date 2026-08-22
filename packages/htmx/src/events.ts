/**
 * Normalized HTMX lifecycle and application events (GH-046).
 *
 * Framework-owned browser hooks and examples use stable Bundar event concepts
 * rather than raw htmx 2 or htmx 4 lifecycle strings.
 *
 * Separates:
 * 1. Client lifecycle events: browser DOM events during HTMX request/swap/settle
 *    phases (normalized across v2 and v4 with exact/approximate/unsupported mappings).
 * 2. Server-triggered application events: custom business events emitted via
 *    HX-Trigger response directives (GH-042), with JSON-safe, injection-tested payloads.
 * 3. Raw dialect event escape hatch: explicit opt-in for unmapped version-specific
 *    events, reportable by audit tooling (GH-078).
 */
import type { HtmxDialectAdapter } from "./dialect";
import { htmx2 } from "./dialects/v2/index";
import { htmx4Experimental } from "./dialects/v4/index";

/** Normalized client lifecycle event names used by Bundar. */
export type BundarLifecycleEvent =
  | "before-request"
  | "after-request"
  | "before-swap"
  | "after-swap"
  | "after-settle"
  | "response-error"
  | "send-error"
  | "history-restore"
  | "oob-before-swap"
  | "oob-after-swap"
  | "timeout";

/** Mapping fidelity between Bundar's normalized event and dialect raw event. */
export type EventMappingKind = "exact" | "approximate" | "unsupported";

export interface EventMapping {
  readonly normalized: BundarLifecycleEvent;
  readonly rawName: string | null;
  readonly mapping: EventMappingKind;
  readonly note?: string;
}

export class EventDefinitionError extends Error {
  public constructor(detail: string) {
    super(`event definition: ${detail}`);
    this.name = "EventDefinitionError";
  }
}

/** Branded escape hatch for raw, unmapped dialect event names. */
export interface RawDialectEvent {
  readonly kind: "raw-dialect-event";
  readonly name: string;
}

/** Explicitly wraps a raw dialect event name to bypass normalization with audit tracking. */
export function rawDialectEvent(name: string): RawDialectEvent {
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new EventDefinitionError(
      "raw dialect event name must be a non-empty string",
    );
  }
  return Object.freeze({
    kind: "raw-dialect-event",
    name: name.trim(),
  });
}

/** HTMX 2 lifecycle event mapping table. */
const HTMX2_EVENT_MAP: Readonly<Record<BundarLifecycleEvent, EventMapping>> =
  Object.freeze({
    "before-request": {
      normalized: "before-request",
      rawName: "htmx:beforeRequest",
      mapping: "exact",
    },
    "after-request": {
      normalized: "after-request",
      rawName: "htmx:afterRequest",
      mapping: "exact",
    },
    "before-swap": {
      normalized: "before-swap",
      rawName: "htmx:beforeSwap",
      mapping: "exact",
    },
    "after-swap": {
      normalized: "after-swap",
      rawName: "htmx:afterSwap",
      mapping: "exact",
    },
    "after-settle": {
      normalized: "after-settle",
      rawName: "htmx:afterSettle",
      mapping: "exact",
    },
    "response-error": {
      normalized: "response-error",
      rawName: "htmx:responseError",
      mapping: "exact",
    },
    "send-error": {
      normalized: "send-error",
      rawName: "htmx:sendError",
      mapping: "exact",
    },
    "history-restore": {
      normalized: "history-restore",
      rawName: "htmx:historyRestore",
      mapping: "exact",
    },
    "oob-before-swap": {
      normalized: "oob-before-swap",
      rawName: "htmx:oobBeforeSwap",
      mapping: "exact",
    },
    "oob-after-swap": {
      normalized: "oob-after-swap",
      rawName: "htmx:oobAfterSwap",
      mapping: "exact",
    },
    timeout: {
      normalized: "timeout",
      rawName: "htmx:timeout",
      mapping: "exact",
    },
  });

/** HTMX 4 beta lifecycle event mapping table (pinned to 4.0.0-beta6). */
const HTMX4_EVENT_MAP: Readonly<Record<BundarLifecycleEvent, EventMapping>> =
  Object.freeze({
    "before-request": {
      normalized: "before-request",
      rawName: "htmx:beforeRequest",
      mapping: "exact",
    },
    "after-request": {
      normalized: "after-request",
      rawName: "htmx:afterRequest",
      mapping: "exact",
    },
    "before-swap": {
      normalized: "before-swap",
      rawName: "htmx:beforeSwap",
      mapping: "exact",
    },
    "after-swap": {
      normalized: "after-swap",
      rawName: "htmx:afterSwap",
      mapping: "exact",
    },
    "after-settle": {
      normalized: "after-settle",
      rawName: "htmx:afterSettle",
      mapping: "exact",
    },
    "response-error": {
      normalized: "response-error",
      rawName: "htmx:responseError",
      mapping: "exact",
    },
    "send-error": {
      normalized: "send-error",
      rawName: "htmx:sendError",
      mapping: "exact",
    },
    "history-restore": {
      normalized: "history-restore",
      rawName: "htmx:historyRestore",
      mapping: "approximate",
      note: "htmx 4 reworks history cache internals [provisional]",
    },
    "oob-before-swap": {
      normalized: "oob-before-swap",
      rawName: "htmx:oobBeforeSwap",
      mapping: "exact",
    },
    "oob-after-swap": {
      normalized: "oob-after-swap",
      rawName: "htmx:oobAfterSwap",
      mapping: "exact",
    },
    timeout: {
      normalized: "timeout",
      rawName: "htmx:timeout",
      mapping: "exact",
    },
  });

/**
 * Resolves a normalized lifecycle event to its dialect-specific DOM event name.
 */
export function resolveDialectEvent(
  event: BundarLifecycleEvent | RawDialectEvent,
  dialect: HtmxDialectAdapter = htmx2,
): EventMapping {
  if (
    typeof event === "object" &&
    event !== null &&
    "kind" in event &&
    event.kind === "raw-dialect-event"
  ) {
    return Object.freeze({
      normalized: "after-request",
      rawName: event.name,
      mapping: "approximate",
      note: `raw unmapped dialect event: ${event.name}`,
    });
  }

  const map = dialect.id === "htmx4" ? HTMX4_EVENT_MAP : HTMX2_EVENT_MAP;
  const normalizedName = event as BundarLifecycleEvent;
  const mapping = map[normalizedName];
  if (mapping === undefined) {
    return Object.freeze({
      normalized: normalizedName,
      rawName: null,
      mapping: "unsupported",
      note: `event ${String(event)} is unsupported in dialect ${dialect.id}`,
    });
  }
  return mapping;
}

/**
 * Returns the entire event mapping table for a dialect (for documentation and audit).
 */
export function getEventMappingTable(
  dialect: HtmxDialectAdapter = htmx2,
): ReadonlyArray<EventMapping> {
  const map = dialect.id === "htmx4" ? HTMX4_EVENT_MAP : HTMX2_EVENT_MAP;
  return Object.freeze(Object.values(map));
}

/** Server-triggered application event (custom business event). */
export interface HtmxApplicationEvent {
  readonly name: string;
  readonly detail?: unknown;
}

const EVENT_NAME_PATTERN = /^[A-Za-z0-9_.:-]+$/;

/**
 * Validates and sanitizes a server-triggered application event.
 * Rejects control characters, header injection characters, and non-JSON-safe payloads.
 */
export function createApplicationEvent(
  name: string,
  detail?: unknown,
): HtmxApplicationEvent {
  if (!EVENT_NAME_PATTERN.test(name) || /[\r\n\0]/.test(name)) {
    throw new EventDefinitionError(
      `invalid application event name: ${JSON.stringify(name)}`,
    );
  }
  if (detail !== undefined) {
    try {
      JSON.stringify(detail);
    } catch {
      throw new EventDefinitionError(
        `application event "${name}" payload must be JSON-serializable`,
      );
    }
  }
  return Object.freeze({ name, detail });
}

export { htmx2, htmx4Experimental };
