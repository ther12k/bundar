/**
 * GH-050 progressive action composer: one action result serves enhanced
 * submissions (fragment + directives + vary + cache policy) and ordinary
 * submissions (approved PRG redirect), with build-time validation for
 * missing fallbacks and conflicting fields.
 */
import { describe, expect, test } from "bun:test";
import { jsx, raw } from "@bundar/jsx";
import {
  ActionDefinitionError,
  action,
  actionResponse,
  ACTION_VARY_HEADERS,
} from "../../src/index";
import { htmx2 } from "../../src/dialects/v2/index";

const TREE = jsx("p", { id: "saved", children: "saved" });

function request(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/items/save", {
    method: "POST",
    headers,
  });
}

describe("GH-050 action() validation (before any response commit)", () => {
  test("a fragment and a fallback redirect form a valid action", () => {
    const result = action({ fragment: TREE, redirectTo: "/items" });
    expect(result.redirect).toEqual({
      kind: "redirect",
      location: "/items",
      status: 303,
    });
    expect(result.status).toBe(200);
    expect(result.directives).toEqual([]);
  });

  test("a missing fallback redirect fails validation", () => {
    expect(() => action({ fragment: TREE })).toThrow(ActionDefinitionError);
  });

  test("routes can opt out of the fallback explicitly", () => {
    const result = action({ fragment: TREE, noFallbackRedirect: true });
    expect(result.redirect).toEqual({ kind: "opt-out" });
  });

  test("conflicting fields are diagnosed", () => {
    expect(() =>
      action({
        fragment: TREE,
        redirectTo: "/items",
        noFallbackRedirect: true,
      }),
    ).toThrow(ActionDefinitionError);
    expect(() => action({ fragment: TREE, redirectStatus: 302 })).toThrow(
      ActionDefinitionError,
    );
  });

  test("a missing fragment fails validation", () => {
    expect(() => action({ redirectTo: "/items" } as never)).toThrow(
      ActionDefinitionError,
    );
  });
});

describe("GH-050 composition", () => {
  test("ordinary submissions receive the approved redirect and location", async () => {
    const response = await actionResponse(
      request(),
      action({ fragment: TREE, redirectTo: "/items" }),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/items");
    expect(await response.text()).toBe("");
  });

  test("the redirect status is the approved set and configurable", async () => {
    for (const status of [301, 302, 303, 307, 308] as const) {
      const response = await actionResponse(
        request(),
        action({
          fragment: TREE,
          redirectTo: "/items",
          redirectStatus: status,
        }),
      );
      expect(response.status).toBe(status);
    }
  });

  test("enhanced submissions receive HTML with directives — no JSON API", async () => {
    const response = await actionResponse(
      request({ "HX-Request": "true" }),
      action({
        fragment: TREE,
        redirectTo: "/items",
        directives: [{ kind: "trigger", events: [{ name: "item-saved" }] }],
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/html; charset=utf-8",
    );
    expect(await response.text()).toBe('<p id="saved">saved</p>');
    // GH-042's encoder emits the deterministic JSON event form
    expect(response.headers.get("hx-trigger")).toBe('{"item-saved":{}}');
  });

  test("enhanced responses carry the negotiation vary and fail-safe cache policy", async () => {
    const response = await actionResponse(
      request({ "HX-Request": "true" }),
      action({ fragment: TREE, redirectTo: "/items" }),
    );
    expect(response.headers.get("vary")).toBe(ACTION_VARY_HEADERS.join(", "));
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  test("private actions keep the enhanced response private", async () => {
    const response = await actionResponse(
      request({ "HX-Request": "true" }),
      action({
        fragment: TREE,
        redirectTo: "/items",
        privateContent: true,
      }),
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  test("the body status is honored on the enhanced path", async () => {
    const response = await actionResponse(
      request({ "HX-Request": "true" }),
      action({ fragment: TREE, redirectTo: "/items", status: 422 }),
    );
    expect(response.status).toBe(422);
  });

  test("opt-out routes serve the fragment plainly to ordinary submissions", async () => {
    const response = await actionResponse(
      request(),
      action({ fragment: TREE, noFallbackRedirect: true }),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('<p id="saved">saved</p>');
  });

  test("plain-string fragments escape as text; markup needs a tree or raw()", async () => {
    const response = await actionResponse(
      request({ "HX-Request": "true" }),
      action({ fragment: "<p>string</p>", redirectTo: "/items" }),
    );
    expect(await response.text()).toBe("&lt;p&gt;string&lt;/p&gt;");
    const rawResponse = await actionResponse(
      request({ "HX-Request": "true" }),
      action({
        // handlers are trusted server code; raw() stays the explicit
        // escape hatch for prebuilt markup (GH-031 boundary)
        fragment: raw("<p>trusted</p>"),
        redirectTo: "/items",
      }),
    );
    expect(await rawResponse.text()).toBe("<p>trusted</p>");
  });

  test("boosted submissions follow the document path (redirect fallback)", async () => {
    // boosted requests negotiate documents (GH-048): the PRG fallback
    // applies, exactly like an ordinary navigation
    const response = await actionResponse(
      request({ "HX-Request": "true", "HX-Boosted": "true" }),
      action({ fragment: TREE, redirectTo: "/items" }),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/items");
  });

  test("composition works through the dialect decoder", async () => {
    const response = await actionResponse(
      request({ "HX-Request": "true" }),
      action({ fragment: TREE, redirectTo: "/items" }),
      { dialect: htmx2 },
    );
    expect(await response.text()).toBe('<p id="saved">saved</p>');
  });
});
