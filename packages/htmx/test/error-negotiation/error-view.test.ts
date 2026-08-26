/**
 * GH-065 error negotiation tests: presentation modes by request kind and
 * status, authorization-failure safety, dialect error-swap differences,
 * retarget-from-server-only, cache/vary policy, and safe content.
 */
import { describe, expect, test } from "bun:test";
import { jsx, document } from "@bundar/jsx";
import {
  errorSwapMode,
  errorViewResponse,
  renderValidationErrorFragment,
  validationErrorView,
} from "../../src/index";
import { htmx2 } from "../../src/dialects/v2/index";
import { htmx4Experimental } from "../../src/dialects/v4/index";
import type { ErrorPresentationPolicy } from "../../src/index";

function fieldErrors() {
  return {
    order: ["name"],
    global: [],
    field: (name: string) => (name === "name" ? ["required"] : []),
    first: [{ field: "name", message: "required" }],
    get empty() {
      return false;
    },
  };
}

const policy: ErrorPresentationPolicy = {
  renderDocument: (view) =>
    document({
      lang: "en",
      title: `Error ${view.status}`,
      children: jsx("body", {
        children: [
          jsx("h1", { children: `Error ${view.status}` }),
          jsx("p", { children: view.message }),
        ],
      }),
    }),
  renderFragment: (view) =>
    jsx("section", {
      id: "error-region",
      children: [
        jsx("h2", { children: view.message }),
        ...(view.fieldErrors
          ? [jsx("p", { children: view.fieldErrors.first[0]!.message })]
          : []),
      ],
    }),
  fragmentTarget: "#form-card",
};

function request(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/items/save", {
    method: "POST",
    headers,
  });
}

describe("GH-065 presentation modes", () => {
  test("ordinary requests receive the full error document", async () => {
    const response = await errorViewResponse(
      request(),
      {
        status: 422,
        code: "unprocessable",
        message: "Validation failed",
        fieldErrors: fieldErrors(),
      },
      policy,
    );
    expect(response.status).toBe(422);
    const body = await response.text();
    expect(body).toContain("<!doctype html>");
    expect(body).toContain("Validation failed");
  });

  test("enhanced requests receive the local fragment", async () => {
    const response = await errorViewResponse(
      request({ "HX-Request": "true" }),
      {
        status: 422,
        code: "unprocessable",
        message: "Validation failed",
        fieldErrors: fieldErrors(),
      },
      policy,
    );
    const body = await response.text();
    expect(body).not.toContain("<!doctype html>");
    expect(body).not.toContain("<html");
    expect(body).toContain('id="error-region"');
    expect(body).toContain("required");
  });

  test("fragment errors retarget to the server-known region only", async () => {
    const response = await errorViewResponse(
      // the client sends a hostile HX-Target; the policy must ignore it
      request({ "HX-Request": "true", "HX-Target": "#admin-panel" }),
      { status: 422, code: "unprocessable", message: "nope" },
      policy,
    );
    expect(response.headers.get("hx-retarget")).toBe("#form-card");
  });

  test("modal-region policies render through their distinct renderer", async () => {
    const modalPolicy: ErrorPresentationPolicy = {
      ...policy,
      renderModalRegion: (view) =>
        jsx("dialog", { id: "error-modal", children: view.message }),
    };
    const response = await errorViewResponse(
      request({ "HX-Request": "true" }),
      { status: 409, code: "conflict", message: "stale copy" },
      modalPolicy,
    );
    const body = await response.text();
    expect(body).toContain('id="error-modal"');
    expect(body).toContain("stale copy");
  });

  test("policies without fragment renderers get safe empty bodies", async () => {
    const minimal: ErrorPresentationPolicy = {
      renderDocument: (view) => `doc-${view.status}`,
    };
    const response = await errorViewResponse(
      request({ "HX-Request": "true" }),
      { status: 500, code: "internal", message: "Internal Server Error" },
      minimal,
    );
    expect(response.status).toBe(500);
    expect(await response.text()).toBe("");
  });
});

describe("GH-065 authorization safety", () => {
  test("401/403 enhanced requests never receive protected fragment content", async () => {
    // the fragment renderer exists — but auth failures must NOT use it
    // unless the app deliberately chose to (it did not here: same policy,
    // which serves auth errors via the document path)
    const response = await errorViewResponse(
      request({ "HX-Request": "true", "HX-Target": "#profile" }),
      { status: 403, code: "forbidden", message: "Access denied" },
      policy,
    );
    const body = await response.text();
    expect(body).toContain("<!doctype html>");
    expect(body).not.toContain('id="error-region"');
    expect(body).not.toContain("#profile");
  });
});

describe("GH-065 dialect error-swap differences", () => {
  test("v2 swaps error responses into the target by default", () => {
    expect(errorSwapMode(htmx2)).toBe("target-swap");
    expect(errorSwapMode()).toBe("target-swap");
  });

  test("the v4 beta does not — the composer adds an explicit reswap", async () => {
    expect(errorSwapMode(htmx4Experimental)).toBe("no-swap");
    const response = await errorViewResponse(
      request({ "HX-Request": "true" }),
      { status: 422, code: "unprocessable", message: "fix fields" },
      policy,
      { dialect: htmx4Experimental },
    );
    // no-swap dialects get swap re-enabled with the region-replacing style
    expect(response.headers.get("hx-reswap")).toBe("outerHTML");
    expect(response.headers.get("hx-retarget")).toBe("#form-card");
  });

  test("v2 fragment errors pair the retarget with the region-replacing reswap", async () => {
    const response = await errorViewResponse(
      request({ "HX-Request": "true" }),
      { status: 422, code: "unprocessable", message: "fix fields" },
      policy,
      { dialect: htmx2 },
    );
    // BR-075 live-browser evidence: a retarget WITHOUT a reswap reuses the
    // triggering element's own swap style (e.g. beforeend) and NESTS the
    // re-rendered form inside the stale region. The fragment replaces the
    // region element, so the retarget is always paired with outerHTML.
    expect(response.headers.get("hx-retarget")).toBe("#form-card");
    expect(response.headers.get("hx-reswap")).toBe("outerHTML");
  });
});

describe("GH-065 headers and content safety", () => {
  test("error responses are private and carry the negotiation vary", async () => {
    const response = await errorViewResponse(
      request({ "HX-Request": "true" }),
      { status: 422, code: "unprocessable", message: "x" },
      policy,
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("vary")).toBe(
      "HX-Request, HX-Boosted, HX-History-Restore-Request",
    );
  });

  test("messages render escaped — no markup injection through errors", async () => {
    const response = await errorViewResponse(
      request({ "HX-Request": "true" }),
      {
        status: 422,
        code: "unprocessable",
        message: "<script>alert(1)</script>",
      },
      policy,
    );
    const body = await response.text();
    expect(body).not.toContain("<script>");
    expect(body).toContain("&lt;script&gt;");
  });
});

describe("GH-065 validation view helpers", () => {
  test("validationErrorView carries the field model and renders a summary", async () => {
    const view = validationErrorView(fieldErrors());
    expect(view.status).toBe(422);
    const tree = renderValidationErrorFragment(view);
    const { renderToString } = await import("@bundar/jsx");
    expect(renderToString(tree)).toContain("required");
  });

  test("the helper rejects views without a field model", () => {
    expect(() =>
      renderValidationErrorFragment({
        status: 422,
        code: "unprocessable",
        message: "x",
      }),
    ).toThrow();
  });
});

describe("GH-065 unexpected 500s", () => {
  test("a 500 renders a safe generic fragment with the envelope message", async () => {
    const response = await errorViewResponse(
      request({ "HX-Request": "true" }),
      {
        status: 500,
        code: "internal",
        message: "Internal Server Error",
        correlationId: "req-123",
      },
      policy,
    );
    expect(response.status).toBe(500);
    const body = await response.text();
    expect(body).not.toContain("req-123"); // correlation stays in logs
    expect(body).toContain("Internal Server Error");
  });
});
