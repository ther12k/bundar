/**
 * GH-052 navigation and open-redirect protection tests.
 */
import { describe, expect, test } from "bun:test";
import {
  composeNavigation,
  htmxLocation,
  htmxRedirect,
  htmxRefresh,
  validateRedirectUrl,
  InvalidRedirectUrlError,
} from "../../src/index";

function ordinaryRequest(url = "http://localhost/form"): Request {
  return new Request(url, { method: "POST" });
}

function htmxRequest(url = "http://localhost/form"): Request {
  return new Request(url, {
    method: "POST",
    headers: { "HX-Request": "true" },
  });
}

describe("GH-052 validateRedirectUrl open-redirect defense", () => {
  test("allows safe relative paths and query strings", () => {
    expect(validateRedirectUrl("/items")).toBe("/items");
    expect(validateRedirectUrl("/users/42?tab=activity#section")).toBe(
      "/users/42?tab=activity#section",
    );
  });

  test("rejects protocol-relative URLs", () => {
    expect(() => validateRedirectUrl("//evil.com")).toThrow(
      InvalidRedirectUrlError,
    );
    expect(() => validateRedirectUrl("///evil.com/path")).toThrow(
      InvalidRedirectUrlError,
    );
  });

  test("rejects executable or dangerous URI schemes", () => {
    expect(() => validateRedirectUrl("javascript:alert(1)")).toThrow(
      InvalidRedirectUrlError,
    );
    expect(() => validateRedirectUrl("data:text/html,evil")).toThrow(
      InvalidRedirectUrlError,
    );
    expect(() => validateRedirectUrl("vbscript:msgbox(1)")).toThrow(
      InvalidRedirectUrlError,
    );
  });

  test("rejects control characters and CRLF injection", () => {
    expect(() => validateRedirectUrl("/items\r\nSet-Cookie: evil")).toThrow(
      InvalidRedirectUrlError,
    );
    expect(() => validateRedirectUrl("/items\0null")).toThrow(
      InvalidRedirectUrlError,
    );
  });

  test("rejects external domains by default", () => {
    expect(() =>
      validateRedirectUrl("https://evil.example.com/login", {
        baseOrigin: "https://app.example.com",
      }),
    ).toThrow(InvalidRedirectUrlError);
  });

  test("allows external domains when explicitly listed in allowedOrigins", () => {
    const url = "https://auth.example.com/oauth/callback";
    expect(
      validateRedirectUrl(url, {
        baseOrigin: "https://app.example.com",
        allowedOrigins: ["https://auth.example.com"],
      }),
    ).toBe(url);
  });
});

describe("GH-052 composeNavigation & helpers", () => {
  test("ordinary requests receive 303 Location redirect", () => {
    const req = ordinaryRequest();
    const res = composeNavigation(req, "/success");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/success");
  });

  test("ordinary requests can configure fallback status", () => {
    const req = ordinaryRequest();
    const res = composeNavigation(req, "/moved", { fallbackStatus: 301 });
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("/moved");
  });

  test("enhanced requests receive 200 with HX-Redirect header", () => {
    const req = htmxRequest();
    const res = htmxRedirect(req, "/dashboard");
    expect(res.status).toBe(200);
    expect(res.headers.get("hx-redirect")).toBe("/dashboard");
    expect(res.headers.get("location")).toBeNull();
  });

  test("htmxLocation emits HX-Location directive for client-side swap", () => {
    const req = htmxRequest();
    const res = htmxLocation(req, {
      path: "/partials/card",
      target: "#card-zone",
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("hx-location")).toBe("/partials/card");
  });

  test("htmxRefresh emits HX-Refresh header", () => {
    const res = htmxRefresh();
    expect(res.status).toBe(200);
    expect(res.headers.get("hx-refresh")).toBe("true");
  });
});
