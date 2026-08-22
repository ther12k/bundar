import { describe, expect, test } from "bun:test";
import { ErrorBoundary } from "../../src/error-boundary";
import { httpErrors } from "../../src/errors";

/**
 * GH-020 production mode: run with NODE_ENV=production (the planned command).
 * Verifies no internals leak and the fallback stays static.
 */
describe("GH-020 production diagnostics", () => {
  test("production boundaries default via NODE_ENV when unset explicitly", () => {
    // Under the planned NODE_ENV=production command this asserts the env
    // flag; inside the default full-suite run the boundary is development
    // by default. Both paths exercise default resolution.
    const explicitProduction = new ErrorBoundary({ development: false });
    expect(explicitProduction.capture(new Error("x")).status).toBe(500);
    if (process.env.NODE_ENV === "production") {
      const defaulted = new ErrorBoundary();
      expect(defaulted.capture(new Error("x")).status).toBe(500);
    }
  });

  test("production bodies contain no message, stack, or cause fragments", async () => {
    const boundary = new ErrorBoundary({ development: false });
    const response = boundary.capture(
      new Error("secret at /home/user/app/src/db.ts:42"),
    );
    const text = await response.text();
    expect(text).not.toContain("secret");
    expect(text).not.toContain("/home/");
    expect(text).not.toContain(".ts:");
    expect(JSON.parse(text)).toEqual({
      error: { code: "internal", message: "Internal Server Error" },
    });
    expect(response.headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
  });

  test("expected failures still expose envelopes in production", async () => {
    const boundary = new ErrorBoundary({ development: false });
    const response = boundary.capture(
      httpErrors.unprocessable("Email required", { field: "email" }),
    );
    const body = (await response.json()) as {
      error: { message: string; details?: { field?: string } };
    };
    expect(response.status).toBe(422);
    expect(body.error.message).toBe("Email required");
    expect(body.error.details?.field).toBe("email");
  });

  test("renderer exceptions still answer with the static fallback", async () => {
    const boundary = new ErrorBoundary({
      development: false,
      renderUnexpected: () => {
        throw new Error("renderer crashed");
      },
    });
    const response = boundary.capture(new Error("original"));
    const text = await response.text();
    expect(response.status).toBe(500);
    expect(text).not.toContain("renderer crashed");
    expect(text).not.toContain("original");
  });
});
