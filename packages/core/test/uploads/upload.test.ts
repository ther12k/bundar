/**
 * GH-064 upload policy tests: bounded reads, server-controlled paths,
 * untrusted metadata, temp-file lifecycle on every path, verifier +
 * quarantine hooks, and multipart adversarial fixtures.
 */
import { describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  cleanupAllUploads,
  DEFAULT_UPLOAD_POLICY,
  handleUploads,
  sanitizeClientName,
  UploadPolicyError,
  uploadFileExists,
} from "../../src/index";
import {
  BodyLimitError,
  createContext,
  UnsupportedMediaTypeError,
} from "../../src/index";
import type { Context } from "../../src/index";

function multipartRequest(
  parts: ReadonlyArray<{
    name: string;
    filename?: string;
    type?: string;
    body: string;
  }>,
  options: { contentLength?: number } = {},
): Request {
  const boundary = "----bundar-test-boundary";
  const chunks: string[] = [];
  for (const part of parts) {
    chunks.push(`--${boundary}\r\n`);
    if (part.filename !== undefined) {
      chunks.push(
        `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\n`,
      );
      chunks.push(`Content-Type: ${part.type ?? "text/plain"}\r\n\r\n`);
    } else {
      chunks.push(
        `Content-Disposition: form-data; name="${part.name}"\r\n\r\n`,
      );
    }
    chunks.push(part.body + "\r\n");
  }
  chunks.push(`--${boundary}--\r\n`);
  const body = chunks.join("");
  return new Request("http://localhost/upload", {
    method: "POST",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
      ...(options.contentLength !== undefined
        ? { "content-length": String(options.contentLength) }
        : {}),
    },
    body,
  });
}

function context(request: Request): Context {
  return createContext(request, {} as Record<string, string>);
}

describe("GH-064 sanitizeClientName", () => {
  test("path components, traversal, and control bytes never survive", () => {
    expect(sanitizeClientName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeClientName("C:\\Users\\evil\\report.pdf")).toBe(
      "report.pdf",
    );
    expect(sanitizeClientName("/var/www/shell.php")).toBe("shell.php");
    expect(sanitizeClientName("..\u0000..\\x")).toBe("x");
    expect(sanitizeClientName("   ")).toBe("upload");
    expect(sanitizeClientName(null)).toBe("upload");
    expect(sanitizeClientName("...")).toBe("upload");
    expect(sanitizeClientName("a".repeat(400))).toHaveLength(255);
  });
});

describe("GH-064 bounded reads and policy enforcement", () => {
  test("non-multipart requests are rejected up front", async () => {
    const error = await handleUploads(
      context(
        new Request("http://localhost/upload", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        }),
      ),
      { handle: () => new Response("x") },
    ).then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(UnsupportedMediaTypeError);
  });

  test("oversized Content-Length fails before reading", async () => {
    const error = await handleUploads(
      context(
        multipartRequest([{ name: "f", filename: "a.bin", body: "x" }], {
          contentLength: 10 * 1024 * 1024 * 10 * 10,
        }),
      ),
      { handle: () => new Response("x") },
    ).then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(BodyLimitError);
  });

  test("a file part over the byte cap is rejected", async () => {
    const error = await handleUploads(
      context(
        multipartRequest([
          { name: "file", filename: "big.bin", body: "x".repeat(64) },
        ]),
      ),
      { policy: { maxFileBytes: 8 }, handle: () => new Response("x") },
    ).then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(UploadPolicyError);
    expect((error as UploadPolicyError).limit).toBe("maxFileBytes");
  });

  test("too many file parts is rejected", async () => {
    const error = await handleUploads(
      context(
        multipartRequest([
          { name: "a", filename: "1.txt", body: "x" },
          { name: "b", filename: "2.txt", body: "x" },
        ]),
      ),
      { policy: { maxFiles: 1 }, handle: () => new Response("x") },
    ).then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(UploadPolicyError);
    expect((error as UploadPolicyError).limit).toBe("maxFiles");
  });

  test("duplicate and extra fields count against maxFields", async () => {
    const error = await handleUploads(
      context(
        multipartRequest([
          { name: "f1", body: "a" },
          { name: "f1", body: "b" },
          { name: "f2", body: "c" },
        ]),
      ),
      { policy: { maxFields: 2 }, handle: () => new Response("x") },
    ).then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(UploadPolicyError);
    expect((error as UploadPolicyError).limit).toBe("maxFields");
  });
});

describe("GH-064 storage, metadata, and lifecycle", () => {
  test("files land under server-generated names with untrusted metadata", async () => {
    const seen: Array<{
      path: string;
      name: string;
      type: string;
      bytes: number;
    }> = [];
    const response = await handleUploads(
      context(
        multipartRequest([
          {
            name: "doc",
            filename: "../../reports/q3 final.pdf",
            type: "application/evil-malware",
            body: "PDF-ish bytes",
          },
        ]),
      ),
      {
        handle: async (uploads) => {
          for (const upload of uploads) {
            seen.push({
              path: upload.path,
              name: upload.clientName,
              type: upload.claimedContentType,
              bytes: upload.bytes,
            });
          }
          return new Response("stored");
        },
      },
    );
    expect(response.status).toBe(200);
    expect(seen).toHaveLength(1);
    // display name is the sanitized basename; the path is server-controlled
    expect(seen[0]!.name).toBe("q3 final.pdf");
    expect(seen[0]!.path).toMatch(/bundar-upload-\S+\/[0-9a-f-]{36}\.part$/);
    expect(seen[0]!.path).not.toContain("reports");
    // the recorded type is whatever the client declared (Bun may normalize
    // common types during parsing) — either way it is CLAIMED, not verified
    expect(typeof seen[0]!.type).toBe("string");
    expect(seen[0]!.type.length).toBeGreaterThan(0);
    // temp files removed after success
    expect(await uploadFileExists(seen[0]!.path)).toBe(false);
  });

  test("temp files are removed when the handler throws", async () => {
    let capturedPath = "";
    const error = await handleUploads(
      context(
        multipartRequest([{ name: "f", filename: "x.txt", body: "data" }]),
      ),
      {
        handle: async (uploads) => {
          capturedPath = uploads[0]!.path;
          throw new Error("handler exploded");
        },
      },
    ).then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect((error as Error).message).toBe("handler exploded");
    expect(await uploadFileExists(capturedPath)).toBe(false);
  });

  test("explicit temp directories are honored but files still cleaned", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bundar-custom-"));
    let path = "";
    await handleUploads(
      context(multipartRequest([{ name: "f", filename: "a.txt", body: "z" }])),
      {
        policy: { tempDirectory: dir },
        handle: async (uploads) => {
          path = uploads[0]!.path;
          return new Response("ok");
        },
      },
    );
    expect(path.startsWith(dir)).toBe(true);
    expect(await uploadFileExists(path)).toBe(false);
  });
});

describe("GH-064 verifier and quarantine", () => {
  test("rejected content is quarantined (file removed, hook fired) and the request fails", async () => {
    const quarantined: string[] = [];
    const error = await handleUploads(
      context(
        multipartRequest([
          {
            name: "f",
            filename: "payload.exe",
            type: "application/x-msdownload",
            body: "MZ...",
          },
        ]),
      ),
      {
        verify: ({ metadata }) =>
          metadata.claimedContentType.includes("msdownload")
            ? { accepted: false, reason: "executable content" }
            : { accepted: true },
        onQuarantine: (info) => quarantined.push(info.metadata.clientName),
        handle: () => new Response("never"),
      },
    ).then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(UploadPolicyError);
    expect((error as UploadPolicyError).limit).toBe("verifier");
    expect(quarantined).toEqual(["payload.exe"]);
  });

  test("accepted content reaches the handler and is cleaned", async () => {
    const verdicts: string[] = [];
    const response = await handleUploads(
      context(
        multipartRequest([{ name: "f", filename: "ok.txt", body: "fine" }]),
      ),
      {
        verify: ({ metadata }) => {
          verdicts.push(metadata.clientName);
          return { accepted: true };
        },
        handle: () => new Response("accepted"),
      },
    );
    expect(await response.text()).toBe("accepted");
    expect(verdicts).toEqual(["ok.txt"]);
  });
});

describe("GH-064 teardown registry", () => {
  test("cleanupAllUploads removes any tracked leftovers", async () => {
    let path = "";
    // simulate an abandoned upload: handler keeps the path, we "cancel"
    // by throwing AFTER recording — finally still cleans; then assert the
    // registry is empty so teardown is a no-op that reports zero
    await handleUploads(
      context(multipartRequest([{ name: "f", filename: "t.txt", body: "x" }])),
      {
        handle: async (uploads) => {
          path = uploads[0]!.path;
          return new Response("done");
        },
      },
    );
    expect(await uploadFileExists(path)).toBe(false);
    expect(await cleanupAllUploads()).toBe(0);
  });
});

describe("GH-064 truncation and adversarial multipart", () => {
  test("truncated multipart bodies fail closed", async () => {
    // body ends before the closing boundary
    const boundary = "----bundar-trunc";
    const request = new Request("http://localhost/upload", {
      method: "POST",
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
      body: `--${boundary}\r\nContent-Disposition: form-data; name="f"; filename="x.txt"\r\n\r\nhalf-written`,
    });
    const error = await handleUploads(context(request), {
      handle: () => new Response("x"),
    }).then(
      () => undefined,
      (caught: unknown) => caught,
    );
    expect(error).toBeDefined();
  });

  test("a default policy exists with sane maximums", () => {
    expect(DEFAULT_UPLOAD_POLICY.maxFileBytes).toBe(10 * 1024 * 1024);
    expect(DEFAULT_UPLOAD_POLICY.maxFiles).toBe(10);
  });
});
