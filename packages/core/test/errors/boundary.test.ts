import { afterAll, describe, expect, test } from "bun:test";
import { App } from "../../src/app";
import { ErrorBoundary } from "../../src/error-boundary";
import {
  httpErrors,
  HttpError,
  isHttpError,
  ClientDisconnectError,
} from "../../src/errors";

describe("GH-020 HttpError envelope", () => {
  test("expected 4xx errors produce deterministic public envelopes", async () => {
    const error = httpErrors.notFound("User not found");
    const response = error.toResponse();
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(await response.clone().json()).toEqual({
      error: { code: "not_found", message: "User not found" },
    });
  });

  test("details and custom headers travel with the envelope", async () => {
    const error = new HttpError("unprocessable", "Invalid input", {
      details: { field: "email", problem: "required" },
      headers: { "x-retry": "no" },
    });
    const response = error.toResponse();
    expect(response.status).toBe(422);
    expect(response.headers.get("x-retry")).toBe("no");
    const body = (await response.clone().json()) as {
      error: { details?: { field?: string } };
    };
    expect(body.error.details?.field).toBe("email");
  });

  test("every code maps to its canonical status", () => {
    expect(httpErrors.badRequest().status).toBe(400);
    expect(httpErrors.unauthorized().status).toBe(401);
    expect(httpErrors.forbidden().status).toBe(403);
    expect(httpErrors.conflict().status).toBe(409);
    expect(httpErrors.payloadTooLarge().status).toBe(413);
    expect(httpErrors.unsupportedMediaType("x/y").status).toBe(415);
    expect(httpErrors.tooManyRequests().status).toBe(429);
    expect(new HttpError("internal", "x").status).toBe(500);
  });

  test("cause is preserved for diagnostics", () => {
    const cause = new Error("db down");
    const error = new HttpError("internal", "query failed", { cause });
    expect(error.cause).toBe(cause);
    expect(isHttpError(error)).toBe(true);
    expect(isHttpError(cause)).toBe(false);
  });
});

describe("GH-020 boundary classification", () => {
  const boundary = new ErrorBoundary({ development: true });

  test("HttpError keeps its public envelope", () => {
    const response = boundary.capture(httpErrors.forbidden());
    expect(response.status).toBe(403);
  });

  test("thrown Responses are preserved (already-created failures)", () => {
    const thrown = new Response("gone", { status: 410 });
    expect(boundary.capture(thrown)).toBe(thrown);
  });

  test("abort/client-disconnect classify separately (499, debug log)", () => {
    const entries: { level: string; message: string }[] = [];
    const logging = new ErrorBoundary({
      development: true,
      log: (entry) =>
        entries.push({ level: entry.level, message: entry.message }),
    });
    const response = logging.capture(new ClientDisconnectError());
    expect(response.status).toBe(499);
    const abortResponse = logging.capture(
      new DOMException("aborted", "AbortError"),
    );
    expect(abortResponse.status).toBe(499);
    expect(entries.every((e) => e.level === "debug")).toBe(true);
  });

  test("unexpected errors include the message only in development", async () => {
    const dev = new ErrorBoundary({ development: true });
    const devResponse = dev.capture(new Error("secret internal detail"));
    const devBody = (await devResponse.json()) as {
      error: { development?: { message?: string } };
    };
    expect(devResponse.status).toBe(500);
    expect(devBody.error.development?.message).toBe("secret internal detail");

    const prod = new ErrorBoundary({ development: false });
    const prodResponse = prod.capture(new Error("secret internal detail"));
    const prodText = await prodResponse.text();
    expect(prodResponse.status).toBe(500);
    expect(prodText).not.toContain("secret");
    expect(prodText).not.toContain("stack");
    expect(JSON.parse(prodText)).toEqual({
      error: { code: "internal", message: "Internal Server Error" },
    });
  });

  test("custom error renderer failure falls back safely", async () => {
    const boundary2 = new ErrorBoundary({
      development: false,
      renderUnexpected: () => {
        throw new Error("renderer itself failed");
      },
    });
    const response = boundary2.capture(new Error("boom"));
    expect(response.status).toBe(500);
    expect(await response.text()).toContain("Internal Server Error");
  });

  test("the logging hook receives classified entries", () => {
    const entries: { level: string }[] = [];
    const logging = new ErrorBoundary({
      development: true,
      log: (entry) => entries.push({ level: entry.level }),
    });
    logging.capture(httpErrors.notFound());
    logging.capture(new Error("unexpected"));
    expect(entries.map((e) => e.level)).toEqual(["info", "error"]);
  });
});

describe("GH-020 boundary through live handlers (wrap)", () => {
  const boundary = new ErrorBoundary({ development: false });
  const app = new App();

  app.get("/throw-expected", () =>
    boundary.wrap(() => {
      throw httpErrors.notFound("missing thing");
    })(),
  );
  app.get("/throw-unexpected", () =>
    boundary.wrap(() => {
      throw new Error("secret detail");
    })(),
  );
  app.get("/ok", () => boundary.wrap(() => new Response("fine"))());

  const server = app.serve({ port: 0 });
  afterAll(() => server.stop(true));

  test("sync handler errors convert to envelopes end-to-end", async () => {
    const expected = await fetch(
      `http://localhost:${server.port}/throw-expected`,
    );
    expect(expected.status).toBe(404);
    const expectedBody = (await expected.json()) as { error: { code: string } };
    expect(expectedBody.error.code).toBe("not_found");

    const unexpected = await fetch(
      `http://localhost:${server.port}/throw-unexpected`,
    );
    expect(unexpected.status).toBe(500);
    const text = await unexpected.text();
    expect(text).not.toContain("secret");
  });

  test("successful handlers pass through untouched", async () => {
    const response = await fetch(`http://localhost:${server.port}/ok`);
    expect(await response.text()).toBe("fine");
  });

  test("async handler rejections route through the boundary", async () => {
    const asyncBoundary = new ErrorBoundary({ development: false });
    const wrapped = asyncBoundary.wrap(async () => {
      throw new Error("async secret");
    });
    const response = await wrapped();
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("async secret");
  });
});
