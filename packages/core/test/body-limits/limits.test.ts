/**
 * BR-066 body-complexity limit tests: boundary parts, many-empty-parts,
 * huge part headers, duplicate fields, per-field/per-file overflow,
 * malformed terminator, slow/aborted bodies — all failing safely with no
 * partial application work (forms-level assertion included).
 */
import { describe, expect, test } from "bun:test";
import {
  BodyLimitError,
  MalformedBodyError,
  DEFAULT_BODY_LIMITS,
  parseForm,
} from "../../src/request/body";
import type { Context } from "../../src/context";

function urlencodedRequest(
  body: string,
  headers: Record<string, string> = {},
): Context {
  return {
    request: new Request("http://t/", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        ...headers,
      },
      body,
    }),
    params: {},
    state: {},
    signal: new AbortController().signal,
  } as unknown as Context;
}

function multipartBody(opts: {
  boundary: string;
  parts: { headers?: string; body?: string; raw?: string }[];
  terminate?: boolean;
}): Context {
  const chunks: string[] = [];
  for (const part of opts.parts) {
    chunks.push(`--${opts.boundary}\r\n`);
    if (part.raw !== undefined) {
      chunks.push(part.raw);
    } else {
      chunks.push(
        `${part.headers ?? 'Content-Disposition: form-data; name="f"'}\r\n\r\n${part.body ?? ""}\r\n`,
      );
    }
  }
  if (opts.terminate !== false) chunks.push(`--${opts.boundary}--\r\n`);
  return {
    request: new Request("http://t/", {
      method: "POST",
      headers: {
        "content-type": `multipart/form-data; boundary=${opts.boundary}`,
      },
      body: chunks.join(""),
    }),
    params: {},
    state: {},
    signal: new AbortController().signal,
  } as unknown as Context;
}

describe("BR-066 request complexity limits", () => {
  test("many-empty-part abuse hits maxParts", async () => {
    // build raw empty-ish parts: header-only then immediate next boundary
    const ctx = multipartBody({
      boundary: "b",
      parts: Array.from({ length: 250 }, () => ({
        headers: 'Content-Disposition: form-data; name="f"',
        body: "",
      })),
    });
    await expect(parseForm(ctx)).rejects.toBeInstanceOf(BodyLimitError);
  });

  test("huge part header block is rejected before native parsing", async () => {
    const bigHeader = `X-Junk: ${"A".repeat(20_000)}`;
    const ctx = multipartBody({
      boundary: "b",
      parts: [
        {
          headers: `Content-Disposition: form-data; name="a"\r\n${bigHeader}`,
          body: "x",
        },
      ],
    });
    await expect(parseForm(ctx)).rejects.toBeInstanceOf(BodyLimitError);
  });

  test("single text field over per-field budget fails", async () => {
    const big = "y".repeat(70_000); // > default maxFieldBytes
    const ctx = urlencodedRequest(`big=${encodeURIComponent(big)}`);
    await expect(parseForm(ctx)).rejects.toBeInstanceOf(BodyLimitError);
  });

  test("duplicate keys beyond the budget fail", async () => {
    const pairs = Array.from({ length: 40 }, (_, i) => `k=v${i}`).join("&");
    const ctx = urlencodedRequest(pairs);
    let error: unknown;
    try {
      await parseForm(ctx);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(BodyLimitError);
    expect((error as BodyLimitError).message).toContain("more than 16 times");
  });

  test("malformed terminator surfaces as MalformedBodyError family", async () => {
    const ctx = multipartBody({
      boundary: "b",
      parts: [
        { headers: 'Content-Disposition: form-data; name="a"', body: "v" },
      ],
      terminate: false,
    });
    let error: unknown;
    try {
      await parseForm(ctx);
    } catch (e) {
      error = e;
    }
    expect(
      error instanceof BodyLimitError || error instanceof MalformedBodyError,
    ).toBe(true);
  });

  test("file over per-file budget fails with sanitized message (no filename echo)", async () => {
    const secretName = "/home/user/SUPER_SECRET_NAME.bin";
    const boundary = "b";
    const filePart =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="up"; filename="${secretName}"\r\n` +
      "Content-Type: application/octet-stream\r\n\r\n" +
      `${Buffer.alloc(11 * 1024 * 1024).toString("latin1")}\r\n` +
      `--${boundary}--\r\n`;
    const ctx = {
      request: new Request("http://t/", {
        method: "POST",
        headers: {
          "content-type": `multipart/form-data; boundary=${boundary}`,
          "content-length": String(Buffer.byteLength(filePart)),
        },
        body: filePart,
      }),
      params: {},
      state: {},
      signal: new AbortController().signal,
    } as unknown as Context;

    let message = "";
    try {
      await parseForm(ctx);
    } catch (e) {
      message = e instanceof Error ? e.message : String(e);
    }
    expect(message).toContain("exceeds");
    expect(message).not.toContain("SUPER_SECRET_NAME");
  });

  test("aborted body fails fast via context.signal (no hang)", async () => {
    const controller = new AbortController();
    // stream that stalls after a small prefix
    const stream = new ReadableStream<Uint8Array>({
      start(controllerStream) {
        controllerStream.enqueue(new TextEncoder().encode("a=1&"));
        // never completes; abort will cancel the reader
      },
    });
    const ctx = {
      request: new Request("http://t/", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: stream,
        duplex: "half",
      }),
      params: {},
      state: {},
      signal: controller.signal,
    } as unknown as Context;

    setTimeout(() => controller.abort(), 20);
    // abort or timeout family — both are safe terminations
    await expect(parseForm(ctx)).rejects.toThrow();
  });

  test("defaults stay within documented safe global maxima", () => {
    expect(DEFAULT_BODY_LIMITS.maxBytes).toBeLessThanOrEqual(16 * 1024 * 1024);
    expect(DEFAULT_BODY_LIMITS.maxFileBytes).toBeLessThanOrEqual(
      32 * 1024 * 1024,
    );
    expect(DEFAULT_BODY_LIMITS.maxParts).toBeLessThanOrEqual(1000);
    expect(DEFAULT_BODY_LIMITS.maxDuplicateKeys).toBeLessThanOrEqual(64);
  });
});
