/**
 * GH-066 security headers, CSP, and nonce tests.
 */
import { describe, expect, test } from "bun:test";
import { composeMiddleware, createContext, text } from "@bundar/core";
import type { Context } from "@bundar/core";
import {
  buildCspHeader,
  getNonce,
  securityHeaders,
  SecurityHeaderError,
} from "../../src/index";

function request(url = "http://localhost/page"): Request {
  return new Request(url);
}

describe("GH-066 nonce generation and propagation", () => {
  test("nonces are unpredictable and unique per request", () => {
    const nonces: string[] = [];
    for (let i = 0; i < 100; i++) {
      const middleware = securityHeaders();
      let captured = "";
      composeMiddleware([middleware], (context: Context) => {
        captured = getNonce(context)!.nonce;
        return text("ok");
      })(createContext(request(), {})); // returns a promise; fire and collect
      nonces.push(captured);
    }
    expect(new Set(nonces).size).toBe(100);
    expect(nonces.every((n) => n.length >= 20)).toBe(true);
  });

  test("getNonce returns undefined without the middleware", () => {
    const context = createContext(request(), {});
    expect(getNonce(context)).toBeUndefined();
  });
});

describe("GH-066 buildCspHeader", () => {
  test("production CSP has nonce-based script-src, no unsafe-inline", () => {
    const csp = buildCspHeader("test-nonce-abc123");
    expect(csp).toContain("script-src 'self' 'nonce-test-nonce-abc123'");
    expect(csp).not.toContain("unsafe-inline");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  test("development CSP allows inline styles and localhost connections", () => {
    const csp = buildCspHeader("dev-nonce", { development: true });
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("localhost");
    expect(csp).toContain("script-src 'self' 'nonce-dev-nonce'");
  });

  test("extra directives are appended, mandatory ones cannot be overridden", () => {
    const csp = buildCspHeader("n", {
      extra: { "media-src": "https://media.example.com" },
    });
    expect(csp).toContain("media-src https://media.example.com");

    expect(() =>
      buildCspHeader("n", { extra: { "frame-ancestors": "https://evil.com" } }),
    ).toThrow(SecurityHeaderError);
    expect(() =>
      buildCspHeader("n", { extra: { "object-src": "https://evil.com" } }),
    ).toThrow(SecurityHeaderError);
    expect(() =>
      buildCspHeader("n", { extra: { "base-uri": "https://evil.com" } }),
    ).toThrow(SecurityHeaderError);
  });

  test("output is deterministic for identical inputs", () => {
    const a = buildCspHeader("same-nonce");
    const b = buildCspHeader("same-nonce");
    expect(a).toBe(b);
  });
});

describe("GH-066 securityHeaders middleware", () => {
  test("applies the full production header set", () => {
    const middleware = securityHeaders();
    return Promise.resolve(
      composeMiddleware([middleware], () => text("body"))(
        createContext(request(), {}),
      ),
    ).then((response) => {
      expect(response.headers.get("content-security-policy")).toContain(
        "default-src 'self'",
      );
      expect(response.headers.get("content-security-policy")).toContain(
        "nonce-",
      );
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(response.headers.get("x-frame-options")).toBe("DENY");
      expect(response.headers.get("referrer-policy")).toBe(
        "strict-origin-when-cross-origin",
      );
      expect(response.headers.get("permissions-policy")).toContain("camera=()");
      expect(response.headers.get("strict-transport-security")).toContain(
        "max-age=31536000",
      );
      expect(response.headers.get("cross-origin-opener-policy")).toBe(
        "same-origin",
      );
    });
  });

  test("development mode disables HSTS and relaxes style-src", () => {
    const middleware = securityHeaders({ development: true });
    return Promise.resolve(
      composeMiddleware([middleware], () => text("body"))(
        createContext(request(), {}),
      ),
    ).then((response) => {
      expect(response.headers.get("strict-transport-security")).toBeNull();
      expect(response.headers.get("content-security-policy")).toContain(
        "unsafe-inline",
      );
    });
  });

  test("handler-set CSP is appended, never replacing mandatory policy", () => {
    const middleware = securityHeaders();
    const handler = () =>
      new Response("body", {
        headers: { "content-security-policy": "media-src from-handler" },
      });
    return Promise.resolve(
      composeMiddleware([middleware], handler)(createContext(request(), {})),
    ).then((response) => {
      const csp = response.headers.get("content-security-policy")!;
      // middleware policy is present alongside the handler value; the
      // mandatory directives cannot be silently removed
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("media-src from-handler");
      expect(csp).toContain("nonce-");
    });
  });

  test("nonce is available to handlers for script/style tags", () => {
    const middleware = securityHeaders();
    let capturedNonce = "";
    return Promise.resolve(
      composeMiddleware([middleware], (context: Context) => {
        const nonceContext = getNonce(context);
        expect(nonceContext).toBeDefined();
        capturedNonce = nonceContext!.nonce;
        expect(nonceContext!.cspHeader()).toContain(capturedNonce);
        return text("ok");
      })(createContext(request(), {})),
    ).then(() => {
      expect(capturedNonce.length).toBeGreaterThan(10);
    });
  });
});
