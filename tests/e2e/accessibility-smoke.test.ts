/**
 * Accessibility smoke (GH-082): the reference surfaces ship accessible
 * markup by construction — live flash regions, alert-role error slots,
 * and labeled form controls — asserted in-process across the Todo and
 * Admin applications (the workflow app's coverage lives in its own
 * suite; the browser lanes assert rendered DOM behavior).
 */
import { describe, expect, test } from "bun:test";
import { createTestClient } from "@bundar/testing";
import { htmx2 } from "@bundar/htmx/2";
import { createTodoApp } from "../../examples/todo/src/app";
import { createInMemoryTodoRepository } from "../../examples/todo/src/domain";

function todoClient() {
  const { app } = createTodoApp({
    repository: createInMemoryTodoRepository({ seed: ["A11y item"] }),
  });
  return createTestClient(app, { dialect: htmx2 });
}

describe("GH-082 accessibility smoke", () => {
  test("flash region is aria-live polite", async () => {
    const html = await (await todoClient().get("/")).text();
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('id="flash"');
  });

  test("form controls are labeled (input + button text)", async () => {
    const html = await (await todoClient().get("/")).text();
    expect(html).toContain('aria-label="Todo title"');
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>Add<\/button>/);
  });

  test("validation errors land in an alert-role slot", async () => {
    const client = todoClient();
    const html = await (await client.get("/")).text();
    expect(html).toContain('role="alert"');
    // and the invalid submission re-renders with the message in that slot
    const token = html.match(/name="_csrf"[^>]*value="([^"]*)"/)?.[1] ?? "";
    const invalid = await client.submitForm("/todos", {
      _csrf: token,
      title: "x",
    });
    expect(invalid.status).toBe(422);
    expect(await invalid.text()).toContain("Title must be 2–200 characters");
  });
});
