/**
 * GH-046 normalized HTMX lifecycle and application events tests.
 */
import { describe, expect, test } from "bun:test";
import {
  createApplicationEvent,
  getEventMappingTable,
  rawDialectEvent,
  resolveDialectEvent,
  EventDefinitionError,
} from "../../src/index";
import { htmx2 } from "../../src/dialects/v2/index";
import { htmx4Experimental } from "../../src/dialects/v4/index";

describe("GH-046 lifecycle event mapping", () => {
  test("maps common lifecycle events for htmx 2", () => {
    expect(resolveDialectEvent("after-request", htmx2).rawName).toBe(
      "htmx:afterRequest",
    );
    expect(resolveDialectEvent("before-request", htmx2).rawName).toBe(
      "htmx:beforeRequest",
    );
    expect(resolveDialectEvent("after-swap", htmx2).rawName).toBe(
      "htmx:afterSwap",
    );
    expect(resolveDialectEvent("after-settle", htmx2).rawName).toBe(
      "htmx:afterSettle",
    );
    expect(resolveDialectEvent("response-error", htmx2).rawName).toBe(
      "htmx:responseError",
    );
    expect(resolveDialectEvent("history-restore", htmx2).mapping).toBe("exact");
  });

  test("maps lifecycle events for htmx 4 beta", () => {
    expect(
      resolveDialectEvent("after-request", htmx4Experimental).rawName,
    ).toBe("htmx:afterRequest");
    expect(
      resolveDialectEvent("history-restore", htmx4Experimental).mapping,
    ).toBe("approximate");
    expect(
      resolveDialectEvent("history-restore", htmx4Experimental).note,
    ).toContain("history cache internals");
  });

  test("getEventMappingTable returns all mapped lifecycle events", () => {
    const table2 = getEventMappingTable(htmx2);
    expect(table2).toHaveLength(11);
    expect(table2.every((entry) => entry.rawName !== null)).toBe(true);

    const table4 = getEventMappingTable(htmx4Experimental);
    expect(table4).toHaveLength(11);
  });
});

describe("GH-046 raw dialect event escape hatch", () => {
  test("wraps raw dialect events and resolves with approximate mapping", () => {
    const raw = rawDialectEvent("htmx:configRequest");
    expect(raw.kind).toBe("raw-dialect-event");
    expect(raw.name).toBe("htmx:configRequest");

    const resolved = resolveDialectEvent(raw, htmx2);
    expect(resolved.rawName).toBe("htmx:configRequest");
    expect(resolved.mapping).toBe("approximate");
  });

  test("rejects empty raw event names", () => {
    expect(() => rawDialectEvent("")).toThrow(EventDefinitionError);
    expect(() => rawDialectEvent("   ")).toThrow(EventDefinitionError);
  });
});

describe("GH-046 server-triggered application events", () => {
  test("creates valid application events with JSON-safe details", () => {
    const ev1 = createApplicationEvent("item-created", {
      id: 42,
      name: "test",
    });
    expect(ev1.name).toBe("item-created");
    expect(ev1.detail).toEqual({ id: 42, name: "test" });

    const ev2 = createApplicationEvent("refresh");
    expect(ev2.name).toBe("refresh");
    expect(ev2.detail).toBeUndefined();
  });

  test("rejects invalid or injection characters in event names", () => {
    expect(() => createApplicationEvent("event\r\ninjection")).toThrow(
      EventDefinitionError,
    );
    expect(() => createApplicationEvent("event\0null")).toThrow(
      EventDefinitionError,
    );
    expect(() => createApplicationEvent("event with spaces")).toThrow(
      EventDefinitionError,
    );
  });

  test("rejects non-JSON serializable payloads", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => createApplicationEvent("bad", cyclic)).toThrow(
      EventDefinitionError,
    );
    expect(() => createApplicationEvent("bad", BigInt(123))).toThrow(
      EventDefinitionError,
    );
  });
});
