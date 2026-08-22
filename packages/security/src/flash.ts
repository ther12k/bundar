/**
 * Flash messages and out-of-band flash regions (GH-063).
 *
 * Flash messages are one-shot notifications with a defined lifecycle:
 * set during a POST, displayed exactly once on the next GET (or the
 * enhanced equivalent via OOB), then consumed. Session-backed storage
 * provides the ordinary navigation flow; serializeUpdates provides the
 * enhanced flow. Message content is escaped (never arbitrary HTML) and
 * size-limited to prevent unbounded session payload growth.
 */
import type { Context } from "@bundar/core";
import { getSession } from "./session/middleware";

export type FlashSeverity = "info" | "success" | "warning" | "error";

export interface FlashRecord {
  readonly id: string;
  readonly severity: FlashSeverity;
  readonly message: string;
  readonly createdAtMs: number;
}

export const FLASH_KEY = "bundar.flash";
export const MAX_FLASH_MESSAGE_LENGTH = 500;
export const MAX_FLASH_COUNT = 10;

export class FlashError extends Error {
  public constructor(detail: string) {
    super(`flash: ${detail}`);
    this.name = "FlashError";
  }
}

/** Session-backed flash store contract (internal). */
interface FlashStore {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  delete(key: string): void;
}

function sessionStore(context: Context): FlashStore {
  const session = getSession(context);
  if (session === undefined) {
    throw new FlashError(
      "flash messages require sessionMiddleware to be installed",
    );
  }
  return session as unknown as FlashStore;
}

let idCounter = 0;
function nextFlashId(): string {
  idCounter = (idCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `f${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

/**
 * Adds a flash message to the session for display on the next request.
 * Message content is size-limited and stored as plain text (never HTML).
 */
export function addFlash(
  context: Context,
  severity: FlashSeverity,
  message: string,
): FlashRecord {
  if (typeof message !== "string") {
    throw new FlashError("flash message must be a string");
  }
  if (message.length > MAX_FLASH_MESSAGE_LENGTH) {
    throw new FlashError(
      `flash message exceeds ${MAX_FLASH_MESSAGE_LENGTH} characters (got ${message.length})`,
    );
  }

  const store = sessionStore(context);
  const existing = (store.get(FLASH_KEY) as FlashRecord[] | undefined) ?? [];
  if (existing.length >= MAX_FLASH_COUNT) {
    // drop the oldest to make room — bounded storage, never unbounded
    existing.shift();
  }

  const record: FlashRecord = {
    id: nextFlashId(),
    severity,
    message,
    createdAtMs: Date.now(),
  };

  store.set(FLASH_KEY, [...existing, record]);
  return record;
}

/**
 * Consumes all pending flash messages (single-consumption: they are
 * removed from the session after reading). Returns them in FIFO order.
 */
export function consumeFlash(context: Context): readonly FlashRecord[] {
  const store = sessionStore(context);
  const existing = store.get(FLASH_KEY) as FlashRecord[] | undefined;
  if (existing === undefined || existing.length === 0) return [];

  // single-consumption: remove before returning
  store.delete(FLASH_KEY);
  return existing;
}

/**
 * Peeks at pending flash messages without consuming them.
 */
export function peekFlash(context: Context): readonly FlashRecord[] {
  const store = sessionStore(context);
  return (store.get(FLASH_KEY) as FlashRecord[] | undefined) ?? [];
}
