/**
 * GH-063 flash message tests: lifecycle (add → consume once), severity,
 * ordering, size limits, session integration, and FlashRegion rendering.
 */
import { describe, expect, test } from "bun:test";
import { composeMiddleware, createContext, text } from "@bundar/core";
import type { Context } from "@bundar/core";
import {
  addFlash,
  consumeFlash,
  createMemorySessionStore,
  FlashError,
  MAX_FLASH_COUNT,
  MAX_FLASH_MESSAGE_LENGTH,
  peekFlash,
  sessionMiddleware,
} from "../src/index";

function sessionContext(): Context {
  return createContext(new Request("http://localhost/flash"), {});
}

function withSession(
  action: (context: Context) => Response | Promise<Response>,
): Promise<Response> {
  const store = createMemorySessionStore();
  const middleware = sessionMiddleware({ store, secure: false });
  // The middleware installs the session on ITS context; the action must
  // receive that inner context, not the outer one
  return Promise.resolve(
    composeMiddleware([middleware], (innerContext: Context) =>
      action(innerContext),
    )(createContext(new Request("http://localhost/flash"), {})),
  );
}

describe("GH-063 addFlash", () => {
  test("stores flash with severity and message in session", () => {
    const action = (context: Context) => {
      addFlash(context, "success", "Item saved successfully");
      const pending = peekFlash(context);
      expect(pending).toHaveLength(1);
      expect(pending[0]!.severity).toBe("success");
      expect(pending[0]!.message).toBe("Item saved successfully");
      return text("ok");
    };
    return withSession(action);
  });

  test("rejects messages exceeding the size limit", () => {
    const action = (context: Context) => {
      expect(() =>
        addFlash(context, "info", "x".repeat(MAX_FLASH_MESSAGE_LENGTH + 1)),
      ).toThrow(FlashError);
      return text("ok");
    };
    return withSession(action);
  });

  test("bounds the number of stored flashes (oldest dropped)", () => {
    const action = (context: Context) => {
      for (let i = 0; i < MAX_FLASH_COUNT + 3; i++) {
        addFlash(context, "info", `message ${i}`);
      }
      const pending = peekFlash(context);
      expect(pending.length).toBe(MAX_FLASH_COUNT);
      // oldest dropped, newest retained
      expect(pending[pending.length - 1]!.message).toBe(
        `message ${MAX_FLASH_COUNT + 2}`,
      );
      return text("ok");
    };
    return withSession(action);
  });

  test("requires sessionMiddleware to be installed", () => {
    const context = sessionContext(); // no session middleware
    expect(() => addFlash(context, "info", "x")).toThrow(FlashError);
  });
});

describe("GH-063 consumeFlash single-consumption", () => {
  test("flash appears once then is consumed", () => {
    const action = (context: Context) => {
      addFlash(context, "success", "Saved");
      const first = consumeFlash(context);
      expect(first).toHaveLength(1);
      expect(first[0]!.message).toBe("Saved");
      // second consumption returns nothing — single-consumption semantics
      const second = consumeFlash(context);
      expect(second).toHaveLength(0);
      return text("ok");
    };
    return withSession(action);
  });

  test("concurrent flashes preserve FIFO ordering", () => {
    const action = (context: Context) => {
      addFlash(context, "info", "first");
      addFlash(context, "success", "second");
      addFlash(context, "warning", "third");
      const consumed = consumeFlash(context);
      expect(consumed.map((f) => f.message)).toEqual([
        "first",
        "second",
        "third",
      ]);
      return text("ok");
    };
    return withSession(action);
  });
});
