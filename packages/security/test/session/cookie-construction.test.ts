/**
 * BR-093 (#145): session middleware must run the shared cookie-attribute
 * validator at construction — dangerous attribute combinations
 * (`__Host-` prefixes, `SameSite=None` without Secure) fail at startup
 * with a clear diagnostic instead of producing cookies browsers silently
 * drop. Also pins the shared validator's contract directly.
 */
import { describe, expect, test } from "bun:test";
import { validateCookieAttributes } from "../../src/cookies";
import { CookiePolicyError } from "../../src/cookies";
import { sessionMiddleware } from "../../src/session/middleware";
import type { SessionStore } from "../../src/session/store";

const noopStore = {
  async load() {
    return null;
  },
  async commit() {
    return null as never;
  },
} as unknown as SessionStore;

describe("BR-093 shared cookie-attribute validator contract", () => {
  test("SameSite=None without Secure is rejected", () => {
    expect(() =>
      validateCookieAttributes({
        name: "sid",
        sameSite: "None",
        secure: false,
      }),
    ).toThrow(CookiePolicyError);
  });

  test("SameSite=None with Secure passes", () => {
    expect(() =>
      validateCookieAttributes({
        name: "sid",
        sameSite: "None",
        secure: true,
        path: "/",
      }),
    ).not.toThrow();
  });

  test("__Host- prefix requires Secure, Path=/, and no Domain", () => {
    expect(() =>
      validateCookieAttributes({ name: "__Host-s", secure: false }),
    ).toThrow(/__Host- cookies require Secure/);
    expect(() =>
      validateCookieAttributes({
        name: "__Host-s",
        secure: true,
        path: "/session",
      }),
    ).toThrow(/__Host- cookies require Path=\//);
    expect(() =>
      validateCookieAttributes({
        name: "__Host-s",
        secure: true,
        domain: "example.com",
      }),
    ).toThrow(/__Host- cookies must not set Domain/);
    expect(() =>
      validateCookieAttributes({
        name: "__Host-s",
        secure: true,
        path: "/",
      }),
    ).not.toThrow();
  });
});

describe("BR-093 construction-time validation wiring", () => {
  test("sessionMiddleware rejects a __Host- cookie with secure:false AT CONSTRUCTION", () => {
    expect(() =>
      sessionMiddleware({
        store: noopStore,
        cookie: "__Host-bundar.session",
        secure: false,
      }),
    ).toThrow(CookiePolicyError);
  });

  test("sessionMiddleware accepts the same name when Secure is on", () => {
    expect(() =>
      sessionMiddleware({
        store: noopStore,
        cookie: "__Host-bundar.session",
        secure: true,
      }),
    ).not.toThrow();
  });

  test("the failure happens before production posture checks (startup, not first request)", () => {
    // The __Host- rejection above fires regardless of environment ordering:
    // pass development settings so nothing else can be responsible for the
    // throw, and assert the diagnostic names the cookie policy.
    try {
      sessionMiddleware({
        store: noopStore,
        cookie: "__Host-x",
        secure: false,
        environment: "development",
      });
      throw new Error("expected construction rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(CookiePolicyError);
      expect((error as Error).message).toContain("__Host-");
    }
  });
});
