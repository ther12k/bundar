/**
 * GH-074 buildHtmxRequestHeaders: canonical header names by default,
 * dialect aliasing from adapter metadata (htmx 4 beta sends the trigger
 * under HX-Source), and optional-field omission.
 */
import { describe, expect, test } from "bun:test";
import { buildHtmxRequestHeaders } from "../src/index";
import { htmx2 } from "../src/v2";
import { htmx4Experimental } from "../src/v4";

describe("GH-074 buildHtmxRequestHeaders", () => {
  test("neutral: canonical names, optional fields omitted", () => {
    const headers = buildHtmxRequestHeaders({ target: "#list" });
    expect(headers).toEqual({ "HX-Request": "true", "HX-Target": "#list" });
    expect(headers["HX-Boosted"]).toBeUndefined();
    expect(headers["HX-Prompt"]).toBeUndefined();
  });

  test("every optional field is included when provided", () => {
    const headers = buildHtmxRequestHeaders({
      target: "#list",
      trigger: "btn",
      triggerName: "add",
      boosted: true,
      currentUrl: "http://x/items",
      prompt: "sure?",
      historyRestore: true,
    });
    expect(headers["HX-Boosted"]).toBe("true");
    expect(headers["HX-Current-URL"]).toBe("http://x/items");
    expect(headers["HX-Prompt"]).toBe("sure?");
    expect(headers["HX-History-Restore-Request"]).toBe("true");
    expect(headers["HX-Trigger"]).toBe("btn");
    expect(headers["HX-Trigger-Name"]).toBe("add");
  });

  test("htmx2 adapter keeps canonical names", () => {
    const headers = buildHtmxRequestHeaders({ trigger: "btn" }, htmx2);
    expect(headers["HX-Trigger"]).toBe("btn");
    expect(headers["HX-Source"]).toBeUndefined();
  });

  test("htmx4 adapter aliases only the trigger header", () => {
    const headers = buildHtmxRequestHeaders(
      { trigger: "btn", target: "#list", boosted: true },
      htmx4Experimental,
    );
    expect(headers["HX-Source"]).toBe("btn");
    expect(headers["HX-Trigger"]).toBeUndefined();
    expect(headers["HX-Target"]).toBe("#list");
    expect(headers["HX-Boosted"]).toBe("true");
  });
});
