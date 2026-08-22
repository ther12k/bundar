/**
 * GH-061 CSRF primitive coverage: token mechanics (binding, expiry,
 * constant-time compare), origin policy fallback chain, and fail-closed
 * verification for every failure mode.
 */
import { describe, expect, test } from "bun:test";
import {
  constantTimeEqual,
  createCsrfSecret,
  issueCsrfToken,
  verifyCsrfToken,
  verifyOrigin,
} from "../../src/index";

import type { CsrfVerdict } from "../../src/index";

function reasonOf(verdict: CsrfVerdict): string {
  return verdict.valid ? "" : verdict.reason;
}

describe("GH-061 token mechanics", () => {
  test("issued tokens verify against the same binding", async () => {
    const secret = createCsrfSecret();
    const issued = await issueCsrfToken(secret, "session-1");
    expect(issued.token.split(".")).toHaveLength(3);
    expect(
      (await verifyCsrfToken(secret, "session-1", issued.token)).valid,
    ).toBe(true);
  });

  test("tokens are bound to the session — cross-session use fails", async () => {
    const secret = createCsrfSecret();
    const issued = await issueCsrfToken(secret, "session-1");
    const verdict = await verifyCsrfToken(secret, "session-2", issued.token);
    expect(verdict.valid).toBe(false);
    if (!verdict.valid) expect(verdict.reason).toBe("binding-mismatch");
  });

  test("expired tokens fail closed", async () => {
    const secret = createCsrfSecret();
    const issued = await issueCsrfToken(secret, "s", { ttlMs: 10 });
    const verdict = await verifyCsrfToken(
      secret,
      "s",
      issued.token,
      Date.now() + 1_000,
    );
    expect(verdict.valid).toBe(false);
    if (!verdict.valid) expect(verdict.reason).toBe("expired");
  });

  test("missing and malformed tokens fail closed", async () => {
    const secret = createCsrfSecret();
    expect(reasonOf(await verifyCsrfToken(secret, "s", null))).toBe("missing");
    expect(reasonOf(await verifyCsrfToken(secret, "s", ""))).toBe("missing");
    expect(reasonOf(await verifyCsrfToken(secret, "s", "garbage"))).toBe(
      "malformed",
    );
    expect(reasonOf(await verifyCsrfToken(secret, "s", "a.b"))).toBe(
      "malformed",
    );
    expect(reasonOf(await verifyCsrfToken(secret, "s", "x.y.z"))).toBe(
      "malformed",
    );
    expect(
      reasonOf(await verifyCsrfToken(secret, "s", `${Date.now()}.n.deadbeef`)),
    ).toBe("binding-mismatch");
  });

  test("tampered MACs fail closed via constant-time comparison", async () => {
    const secret = createCsrfSecret();
    const issued = await issueCsrfToken(secret, "s");
    const [expiry, nonce, mac] = issued.token.split(".") as [
      string,
      string,
      string,
    ];
    const flipped = mac.startsWith("0")
      ? mac.replace(/^0/, "1")
      : `0${mac.slice(1)}`;
    const verdict = await verifyCsrfToken(
      secret,
      "s",
      `${expiry}.${nonce}.${flipped}`,
    );
    expect(verdict.valid).toBe(false);
    expect(
      constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3])),
    ).toBe(true);
    expect(
      constantTimeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4])),
    ).toBe(false);
    expect(constantTimeEqual(new Uint8Array(1), new Uint8Array(2))).toBe(false);
  });

  test("secrets are random per creation", () => {
    const a = createCsrfSecret();
    const b = createCsrfSecret();
    expect(constantTimeEqual(a.bytes, b.bytes)).toBe(false);
  });
});

describe("GH-061 origin policy (documented fallback chain)", () => {
  const request = (headers: Record<string, string>): Request =>
    new Request("https://app.example.com/act", {
      method: "POST",
      headers,
    });

  test("sec-fetch-site same-origin passes", () => {
    expect(
      verifyOrigin(request({ "sec-fetch-site": "same-origin" })).valid,
    ).toBe(true);
  });

  test("sec-fetch-site cross-site and same-site fail for state changes", () => {
    expect(
      verifyOrigin(request({ "sec-fetch-site": "cross-site" })).valid,
    ).toBe(false);
    expect(verifyOrigin(request({ "sec-fetch-site": "same-site" })).valid).toBe(
      false,
    );
  });

  test("origin header matching the request origin passes", () => {
    expect(
      verifyOrigin(request({ origin: "https://app.example.com" })).valid,
    ).toBe(true);
  });

  test("cross-origin origins fail; allow-listing is explicit", () => {
    expect(
      verifyOrigin(request({ origin: "https://evil.example.net" })).valid,
    ).toBe(false);
    expect(
      verifyOrigin(request({ origin: "https://partner.example.org" }), {
        allowedOrigins: ["https://partner.example.org"],
      }).valid,
    ).toBe(true);
  });

  test("no origin evidence fails closed", () => {
    const verdict = verifyOrigin(request({}));
    expect(verdict.valid).toBe(false);
  });
});
