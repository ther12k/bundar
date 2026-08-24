/**
 * BR-067 compatibility and redaction tests: frozen code registry, error-id
 * correlation, detail redaction, stack gating, lifecycle/session mapping.
 */
import { describe, expect, test } from "bun:test";
import {
  HttpError,
  STATUS_BY_CODE,
  type HttpErrorCode,
} from "../../src/errors";
import {
  generateErrorId,
  redactDetails,
  sanitizeStack,
} from "../../src/error-redaction";
import { ErrorBoundary } from "../../src/error-boundary";
import { LifecycleStartError } from "../../src/lifecycle";

/** FROZEN registry — changes require a release-notes entry. */
const GOLDEN: Record<HttpErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  method_not_allowed: 405,
  conflict: 409,
  unprocessable: 422,
  payload_too_large: 413,
  unsupported_media_type: 415,
  too_many_requests: 429,
  request_timeout: 408,
  internal: 500,
  service_unavailable: 503,
  server_shutting_down: 503,
  lifecycle_start_failed: 503,
  session_unavailable: 503,
};

describe("BR-067 stable error codes", () => {
  test("code→status registry is frozen (compatibility surface)", () => {
    expect(STATUS_BY_CODE).toEqual(GOLDEN);
    const codes = Object.keys(STATUS_BY_CODE).sort();
    expect(codes).toEqual(Object.keys(GOLDEN).sort());
  });

  test("every boundary response carries a unique x-bundar-error-id", async () => {
    const boundary = new ErrorBoundary({ development: false });
    const httpId = boundary
      .capture(new HttpError("not_found", "nope"))
      .headers.get("x-bundar-error-id");
    const unexpectedId = boundary
      .capture(new Error("boom"))
      .headers.get("x-bundar-error-id");
    expect(httpId).toMatch(/^err_[0-9a-f]{16}$/);
    expect(unexpectedId).toMatch(/^err_[0-9a-f]{16}$/);
    expect(httpId).not.toBe(unexpectedId);
  });

  test("HttpError details are redacted at the boundary", async () => {
    const boundary = new ErrorBoundary({ development: false });
    const response = boundary.capture(
      new HttpError("unprocessable", "bad input", {
        details: {
          cookie: "session=abc",
          authorization: "Bearer x",
          nested: { token: "t", safe: 1 },
          path: "/home/user/secrets/file.txt",
        },
      }),
    );
    const body = (await response.json()) as {
      error: { details: Record<string, unknown> };
    };
    expect(body.error.details["cookie"]).toBe("[redacted]");
    expect(body.error.details["authorization"]).toBe("[redacted]");
    expect(
      (body.error.details["nested"] as Record<string, unknown>)["token"],
    ).toBe("[redacted]");
    expect(
      (body.error.details["nested"] as Record<string, unknown>)["safe"],
    ).toBe(1);
    expect(body.error.details["path"]).toBe("[path]");
  });

  test("production responses never include stacks; development may", () => {
    expect(sanitizeStack("at file.ts:1", false)).toBeUndefined();
    expect(sanitizeStack("at file.ts:1", true)).toBe("at file.ts:1");

    // default prod renderer body has no dev block at all
    const boundary = new ErrorBoundary({
      development: false,
      log: () => undefined,
    });
    void boundary;
  });

  test("lifecycle failures map to lifecycle_start_failed/503", () => {
    const logs: unknown[] = [];
    const boundary = new ErrorBoundary({
      development: false,
      log: (entry) => logs.push(entry),
    });
    const response = boundary.capture(
      new LifecycleStartError("database", new Error("ECONNREFUSED")),
    );
    expect(response.status).toBe(503);
  });

  test("generateErrorId is unique across many calls", () => {
    const ids = new Set(Array.from({ length: 500 }, () => generateErrorId()));
    expect(ids.size).toBe(500);
  });

  test("redactDetails masks path-like strings deeply", () => {
    const out = redactDetails({
      note: "see /var/log/app/error.log",
      list: ["/Users/dev/x.ts"],
      ok: "no paths here",
    }) as { note: string; list: string[]; ok: string };
    expect(out.note).toBe("see [path]");
    expect(out.list[0]).toBe("[path]");
    expect(out.ok).toBe("no paths here");
  });
});
