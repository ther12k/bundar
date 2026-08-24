/**
 * BR-060 cookie policy tests: the five deployment scenarios plus
 * dangerous-combination rejection and __Host- prefix rules.
 */
import { describe, expect, test } from "bun:test";
import {
  CookiePolicyError,
  resolveCookieSecure,
  validateCookieAttributes,
} from "../../src/cookies";
import type { ProxyTrustConfig } from "../../src/proxy";

const TRUST: ProxyTrustConfig = { proxies: ["10.0.0.5"] };

function req(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

describe("BR-060 cookie policy derivation", () => {
  test("1. direct HTTP development: insecure only with explicit allowance", () => {
    const input = {
      request: makeReq("http://localhost:3000/"),
      peer: "127.0.0.1",
      environment: "development" as const,
    };
    expect(() => resolveCookieSecure(input)).toThrow(CookiePolicyError);
    expect(resolveCookieSecure(input, { allowInsecureDevelopment: true })).toBe(
      false,
    );
  });

  test("2. direct HTTPS: Secure without any allowance", () => {
    expect(
      resolveCookieSecure({
        request: makeReq("https://app.example/"),
        peer: "203.0.113.9",
        environment: "production",
      }),
    ).toBe(true);
  });

  test("3. trusted TLS termination produces Secure cookies", () => {
    expect(
      resolveCookieSecure({
        request: makeReq("https://app.example/", {
          "x-forwarded-for": "203.0.113.7",
          "x-forwarded-proto": "https",
        }),
        peer: "10.0.0.5",
        trust: TRUST,
        environment: "production",
      }),
    ).toBe(true);
  });

  test("4. untrusted proxy cannot flip policy in either direction", () => {
    const forged = req("http://app/", {
      "x-forwarded-proto": "https",
      "x-forwarded-for": "1.2.3.4",
    });
    // attacker claims https; untrusted peer → production http → hard fail
    expect(() =>
      resolveCookieSecure({
        request: forged,
        peer: "198.51.100.1",
        trust: TRUST,
        environment: "production",
      }),
    ).toThrow(CookiePolicyError);

    // attacker cannot downgrade a genuinely-https origin either
    const genuineHttps = req("https://app/", {
      "x-forwarded-proto": "http",
      "x-forwarded-for": "1.2.3.4",
    });
    expect(
      resolveCookieSecure({
        request: genuineHttps,
        peer: "10.0.0.5",
        trust: TRUST,
        environment: "production",
      }),
    ).toBe(true);
  });

  test("5. malformed forwarded values fail closed to connection scheme", () => {
    const malformed = req("https://app/", {
      "x-forwarded-proto": "%E0%A4%A", // invalid percent-encoding
      "x-forwarded-for": "not-an-ip",
    });
    expect(
      resolveCookieSecure({
        request: malformed,
        peer: "10.0.0.5",
        trust: TRUST,
        environment: "production",
      }),
    ).toBe(true); // falls back to the https connection itself
  });

  test("dangerous combinations are rejected at construction", () => {
    expect(() =>
      validateCookieAttributes({
        name: "sid",
        sameSite: "None",
        secure: false,
      }),
    ).toThrow(/SameSite=None requires Secure/);

    expect(() =>
      validateCookieAttributes({
        name: "__Host-sid",
        secure: false,
      }),
    ).toThrow(/__Host- cookies require Secure/);

    expect(() =>
      validateCookieAttributes({
        name: "__Host-sid",
        secure: true,
        path: "/app",
      }),
    ).toThrow(/Path=/);

    expect(() =>
      validateCookieAttributes({
        name: "__Host-sid",
        secure: true,
        domain: "example.com",
      }),
    ).toThrow(/must not set Domain/);
  });
});

function makeReq(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}
