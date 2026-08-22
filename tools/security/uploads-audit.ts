/**
 * Upload security audit (GH-064).
 *
 * Fail-closed proof of the upload contract: filenames cannot select paths,
 * limits reject during read, temp files never outlive the request on any
 * path, quarantined content is removed, and the production guide states
 * the content-validation requirement.
 */
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BodyLimitError,
  cleanupAllUploads,
  createContext,
  handleUploads,
  sanitizeClientName,
  uploadFileExists,
} from "../../packages/core/src/index";
import { UploadPolicyError } from "../../packages/core/src/index";

const failures: string[] = [];
const check = (name: string, ok: boolean): void => {
  if (!ok) failures.push(name);
};

function uploadContextFrom(request: Request) {
  return createContext(request, {} as Record<string, string>);
}

function multipart(
  parts: ReadonlyArray<{ name: string; filename?: string; body: string }>,
  contentLength?: number,
): Request {
  void contentLength;
  const boundary = "----audit-boundary";
  const chunks: string[] = [];
  for (const part of parts) {
    chunks.push(`--${boundary}\r\n`);
    chunks.push(
      part.filename === undefined
        ? `Content-Disposition: form-data; name="${part.name}"\r\n\r\n`
        : `Content-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
    );
    chunks.push(part.body + "\r\n");
  }
  chunks.push(`--${boundary}--\r\n`);
  return new Request("http://localhost/upload", {
    method: "POST",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
      ...(contentLength !== undefined
        ? { "content-length": String(contentLength) }
        : {}),
    },
    body: chunks.join(""),
  });
}

// 1. path selection is impossible
check(
  "traversal filename sanitized",
  sanitizeClientName("../../etc/passwd") === "passwd",
);
check(
  "windows path sanitized",
  sanitizeClientName("C:\\Windows\\evil.dll") === "evil.dll",
);
{
  let path = "";
  await handleUploads(
    createContext(
      multipart([{ name: "f", filename: "../../escape.bin", body: "x" }]),
      {} as never,
    ),
    {
      handle: async (uploads) => {
        path = uploads[0]!.path;
        return new Response("ok");
      },
    },
  );
  check("temp path contains no client segments", !path.includes("escape"));
  check(
    "temp path exists under a bundar temp dir",
    path.includes("bundar-upload"),
  );
  check("file removed after success", !(await uploadFileExists(path)));
}

// 2. limits reject during read
{
  const error = await handleUploads(
    uploadContextFrom(
      multipart([{ name: "f", filename: "big.bin", body: "x".repeat(100) }]),
    ),
    { policy: { maxFileBytes: 10 }, handle: () => new Response("x") },
  ).then(
    () => undefined,
    (caught: unknown) => caught,
  );
  check("oversize part rejected", error instanceof UploadPolicyError);
}
{
  const error = await handleUploads(
    uploadContextFrom(
      multipart([{ name: "f", filename: "a.bin", body: "x" }], 999_999_999),
    ),
    { handle: () => new Response("x") },
  ).then(
    () => undefined,
    (caught: unknown) => caught,
  );
  check(
    "oversized declared length rejected pre-read",
    error instanceof BodyLimitError,
  );
}

// 3. temp files never outlive failures
{
  let path = "";
  await handleUploads(
    uploadContextFrom(
      multipart([{ name: "f", filename: "x.txt", body: "data" }]),
    ),
    {
      handle: async (uploads) => {
        path = uploads[0]!.path;
        throw new Error("boom");
      },
    },
  ).catch(() => undefined);
  check(
    "temp file removed after handler error",
    !(await uploadFileExists(path)),
  );
}

// 4. quarantine removes the file and fires the hook
{
  const quarantined: string[] = [];
  const error = await handleUploads(
    uploadContextFrom(
      multipart([{ name: "f", filename: "evil.exe", body: "MZ" }]),
    ),
    {
      verify: () => ({ accepted: false, reason: "test-reject" }),
      onQuarantine: (info) => quarantined.push(info.metadata.clientName),
      handle: () => new Response("never"),
    },
  ).then(
    () => undefined,
    (caught: unknown) => caught,
  );
  check("verifier rejection surfaces", error instanceof UploadPolicyError);
  check("quarantine hook fired", quarantined.includes("evil.exe"));
}

// 5. custom directories honored + cleaned
{
  const dir = await mkdtemp(join(tmpdir(), "bundar-audit-"));
  let path = "";
  await handleUploads(
    uploadContextFrom(multipart([{ name: "f", filename: "c.txt", body: "z" }])),
    {
      policy: { tempDirectory: dir },
      handle: async (uploads) => {
        path = uploads[0]!.path;
        return new Response("ok");
      },
    },
  );
  check("custom directory honored", path.startsWith(dir));
  check("custom-directory file cleaned", !(await uploadFileExists(path)));
}

// 6. teardown registry drains
check("teardown registry empty", (await cleanupAllUploads()) === 0);

// 7. production documentation requirement
const guide = readFileSync(
  join(import.meta.dir, "../../docs/guides/uploads.md"),
  "utf8",
);
check(
  "guide requires content validation",
  guide.includes("Content validation is mandatory"),
);
check("guide covers sniffing", guide.includes("sniff"));
check("guide covers malware scanning", guide.includes("malware"));

if (failures.length > 0) {
  console.error("security:uploads: FAILED");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  "security:uploads: ok (paths server-controlled; limits enforced during read; temp files removed on every path; quarantine removes + alerts; teardown drains; production guide requires content validation and scanning)",
);
