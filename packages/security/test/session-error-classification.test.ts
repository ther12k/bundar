/**
 * BR-067 cross-package mapping: SessionStoreError surfaces as
 * session_unavailable/503 through the core boundary (consumer fixture).
 */
import { describe, expect, test } from "bun:test";
import { ErrorBoundary } from "../../../packages/core/src/error-boundary";
import { SessionStoreError } from "../src/session/store";

describe("BR-067 session failure classification", () => {
  test("maps to session_unavailable/503 without leaking internals", async () => {
    const boundary = new ErrorBoundary({ development: false });
    const response = boundary.capture(
      new SessionStoreError(
        "unavailable",
        "redis down at /home/user/internal/redis.ts",
      ),
    );
    expect(response.status).toBe(503);
    const body = (await response.json()) as {
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe("session_unavailable");
    expect(body.error.message).not.toContain("/home/");
    expect(response.headers.get("x-bundar-error-id")).toMatch(/^err_/);
  });
});
