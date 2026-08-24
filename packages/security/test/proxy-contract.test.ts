/**
 * BR-059 proxy-contract tests: fail-closed defaults, explicit trust,
 * rightmost-untrusted hop walking, malformed/duplicate rejection, IPv4-
 * mapped IPv6 normalization, and CIDR allowlists.
 */
import { describe, expect, test } from "bun:test";
import {
  isProxyTrusted,
  resolveClient,
  type ProxyTrustConfig,
} from "../src/proxy";

function makeRequest(
  url: string,
  headers: Record<string, string> = {},
): Request {
  return new Request(url, { headers });
}

describe("BR-059 trusted-proxy contract", () => {
  test("default: forwarded headers are ignored entirely", () => {
    const request = makeRequest("http://app.internal/x", {
      "x-forwarded-for": "1.2.3.4",
      "x-forwarded-proto": "https",
      "x-forwarded-host": "evil.example",
    });
    const resolved = resolveClient(request, "10.0.0.9");
    expect(resolved.address).toBe("10.0.0.9"); // raw peer
    expect(resolved.forwardedTrusted).toBe(false);
    expect(resolved.proto).toBe("http");
    expect(resolved.host).toBe("app.internal");
  });

  test("isProxyTrusted requires a non-empty allowlist", () => {
    expect(isProxyTrusted(undefined)).toBe(false);
    expect(isProxyTrusted({ proxies: [] })).toBe(false);
    expect(isProxyTrusted({ proxies: ["10.0.0.1"] })).toBe(true);
  });

  test("untrusted immediate peer discards forwarded data (fail closed)", () => {
    const config: ProxyTrustConfig = { proxies: ["10.0.0.5"] };
    const request = makeRequest("http://app/x", {
      "x-forwarded-for": "203.0.113.7",
    });
    const resolved = resolveClient(request, "198.51.100.1", config);
    expect(resolved.address).toBe("198.51.100.1");
    expect(resolved.forwardedTrusted).toBe(false);
  });

  test("single trusted proxy: client is the leftmost XFF entry", () => {
    const config: ProxyTrustConfig = { proxies: ["10.0.0.5"] };
    const request = makeRequest("https://app/x", {
      "x-forwarded-for": "203.0.113.7",
      "x-forwarded-proto": "https",
    });
    const resolved = resolveClient(request, "10.0.0.5", config);
    expect(resolved.address).toBe("203.0.113.7");
    expect(resolved.proto).toBe("https");
    expect(resolved.forwardedTrusted).toBe(true);
  });

  test("rightmost-untrusted walk across a trusted chain", () => {
    const config: ProxyTrustConfig = {
      proxies: ["10.0.0.5", "10.0.0.6"],
      maxHops: 2,
    };
    // chain: client(203.0.113.7) -> proxy .6 -> proxy .5 -> app
    const request = makeRequest("http://app/x", {
      "x-forwarded-for": "203.0.113.7, 10.0.0.6",
    });
    const resolved = resolveClient(request, "10.0.0.5", config);
    expect(resolved.address).toBe("203.0.113.7");
  });

  test("more hops than maxHops stops at the bounded boundary", () => {
    const config: ProxyTrustConfig = { proxies: ["10.0.0.5"], maxHops: 1 };
    const request = makeRequest("http://app/x", {
      // attacker injects a fake leftmost entry through an inner proxy
      "x-forwarded-for": "9.9.9.9, 10.0.0.99, 203.0.113.7",
    });
    const resolved = resolveClient(request, "10.0.0.5", config);
    // rightmost hop 203.0.113.7 is untrusted → that becomes the client;
    // the spoofed 9.9.9.9 never wins.
    expect(resolved.address).toBe("203.0.113.7");
  });

  test("malformed XFF entry fails closed to the raw peer", () => {
    const config: ProxyTrustConfig = { proxies: ["10.0.0.5"] };
    const request = makeRequest("http://app/x", {
      "x-forwarded-for": "not-an-ip",
    });
    const resolved = resolveClient(request, "10.0.0.5", config);
    expect(resolved.address).toBe("10.0.0.5");
    expect(resolved.forwardedTrusted).toBe(false);
  });

  test("IPv4-mapped IPv6 peers normalize for exact matching", () => {
    const config: ProxyTrustConfig = { proxies: ["10.0.0.5"] };
    const request = makeRequest("http://app/x", {
      "x-forwarded-for": "203.0.113.7",
    });
    const resolved = resolveClient(request, "::ffff:10.0.0.5", config);
    expect(resolved.forwardedTrusted).toBe(true);
    expect(resolved.address).toBe("203.0.113.7");
  });

  test("CIDR allowlist matches the trusted subnet", () => {
    const config: ProxyTrustConfig = { proxies: ["10.0.0.0/8"] };
    const request = makeRequest("http://app/x", {
      "x-forwarded-for": "203.0.113.7",
    });
    const resolved = resolveClient(request, "10.77.2.3", config);
    expect(resolved.forwardedTrusted).toBe(true);
    expect(resolved.address).toBe("203.0.113.7");
  });

  test("RFC 7239 Forwarded proto is honored when configured family allows", () => {
    const config: ProxyTrustConfig = { proxies: ["10.0.0.5"] };
    const request = makeRequest("http://app/x", {
      "x-forwarded-for": "203.0.113.7",
      forwarded: "for=203.0.113.7;proto=https",
    });
    const resolved = resolveClient(request, "10.0.0.5", config);
    expect(resolved.proto).toBe("https");
  });

  test("X-Forwarded-Host supplies the canonical host only under trust", () => {
    const config: ProxyTrustConfig = { proxies: ["10.0.0.5"] };
    const request = makeRequest("http://app/x", {
      "x-forwarded-for": "203.0.113.7",
      "x-forwarded-host": "public.example",
    });
    expect(resolveClient(request, "10.0.0.5", config).host).toBe(
      "public.example",
    );
    expect(resolveClient(request, "10.0.0.5").host).toBe("app");
  });
});
