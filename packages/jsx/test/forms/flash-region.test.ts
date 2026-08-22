/**
 * GH-063 FlashRegion rendering tests: accessible severity roles, empty
 * placeholder, and message escaping.
 */
import { describe, expect, test } from "bun:test";
import { FlashRegion, renderToString } from "../../src/index";

describe("GH-063 FlashRegion rendering", () => {
  test("renders accessible flash messages with severity roles", () => {
    const html = renderToString(
      FlashRegion({
        messages: [
          {
            id: "f1",
            severity: "success",
            message: "Item saved",
            createdAtMs: Date.now(),
          },
          {
            id: "f2",
            severity: "error",
            message: "Something broke",
            createdAtMs: Date.now(),
          },
        ],
      }),
    );
    expect(html).toContain('id="flash-region"');
    expect(html).toContain("Item saved");
    expect(html).toContain("Something broke");
    expect(html).toContain('role="status"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('data-severity="success"');
    expect(html).toContain('data-severity="error"');
  });

  test("empty region renders a targetable placeholder", () => {
    const html = renderToString(FlashRegion({ messages: [] }));
    expect(html).toContain('id="flash-region"');
    expect(html).toContain('aria-live="polite"');
  });

  test("defaults to empty when no messages passed", () => {
    const html = renderToString(FlashRegion());
    expect(html).toContain('id="flash-region"');
  });

  test("message content is escaped (no HTML injection)", () => {
    const html = renderToString(
      FlashRegion({
        messages: [
          {
            id: "f1",
            severity: "info",
            message: '<script>alert("XSS")</script>',
            createdAtMs: Date.now(),
          },
        ],
      }),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
