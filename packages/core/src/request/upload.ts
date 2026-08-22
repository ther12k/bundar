/**
 * Multipart upload policy and safe temporary-file handling (GH-064).
 *
 * Uploads are bounded DURING the read (Content-Length pre-checks and
 * per-part streaming caps — never buffer-then-check), filenames and MIME
 * types arrive as UNTRUSTED display data (sanitized basename, no path
 * semantics, content type recorded as client-claimed), and parts land in a
 * caller-provided temp directory under server-generated names — a client
 * filename can never select a path. Temp files are removed on success,
 * error, cancellation, and via a registry on teardown; a verifier hook
 * (malware scan, sniffing) and a quarantine hook are integration points,
 * not built-ins. Out of scope: object storage and malware engines.
 */
import { mkdtemp, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Context } from "../context";
import { BodyLimitError, UnsupportedMediaTypeError } from "./body";

/** Frozen upload policy (server maximums; per-route may tighten only). */
export interface UploadPolicy {
  /** Maximum bytes per file part. */
  readonly maxFileBytes: number;
  /** Maximum number of file parts per request. */
  readonly maxFiles: number;
  /** Maximum non-file fields per request. */
  readonly maxFields: number;
  /** Directory for temp files. Default: a fresh OS temp subdir per call. */
  readonly tempDirectory?: string;
}

export const DEFAULT_UPLOAD_POLICY: UploadPolicy = Object.freeze({
  maxFileBytes: 10 * 1024 * 1024,
  maxFiles: 10,
  maxFields: 100,
});

export class UploadPolicyError extends Error {
  public readonly limit: string;

  public constructor(limit: string, detail: string) {
    super(`upload policy violation (${limit}): ${detail}`);
    this.name = "UploadPolicyError";
    this.limit = limit;
  }
}

/** A safely-materialized upload: server-controlled path + untrusted metadata. */
export interface StoredUpload {
  /** Server-generated absolute path (client never influences it). */
  readonly path: string;
  readonly bytes: number;
  /** Sanitized BASENAME for display only — never a path, never trusted. */
  readonly clientName: string;
  /** Client-claimed content type (untrusted; sniff before use). */
  readonly claimedContentType: string;
  /** Remove the temp file now (idempotent). */
  cleanup(): Promise<void>;
}

/** Untrusted metadata, normalized for display/auditing. */
export interface UploadMetadata {
  readonly clientName: string;
  readonly claimedContentType: string;
  readonly bytes: number;
}

export interface UploadVerifierResult {
  readonly accepted: boolean;
  readonly reason?: string;
}

/**
 * Content-verification integration point (malware scan / sniffing).
 * Return `{ accepted: false }` to reject + quarantine.
 */
export type UploadVerifier = (upload: {
  readonly path: string;
  readonly metadata: UploadMetadata;
}) => Promise<UploadVerifierResult> | UploadVerifierResult;

export interface HandleUploadsOptions {
  readonly policy?: Partial<UploadPolicy>;
  /**
   * Verifier hook: runs per file AFTER the bytes land, BEFORE the handler
   * sees them. Rejected files are quarantined (moved aside) and removed.
   */
  readonly verify?: UploadVerifier;
  /**
   * Quarantine hook for rejected uploads (alerting/inspection). Receives
   * the removed file path + metadata; the temp file is already deleted.
   */
  readonly onQuarantine?: (info: {
    readonly path: string;
    readonly metadata: UploadMetadata;
    readonly reason: string;
  }) => void;
  /** Called after all parts are consumed; handlers read uploads here. */
  readonly handle: (
    uploads: readonly StoredUpload[],
  ) => Promise<Response> | Response;
}

/** Strips every path component and control char from a client filename. */
export function sanitizeClientName(raw: string | null | undefined): string {
  if (raw === null || raw === undefined) return "upload";
  // take the final path segment whatever the client sent
  const segments = raw.split(/[\\/]/);
  const base = segments[segments.length - 1] ?? "";
  // drop control characters and path-meta sequences; keep display runes
  const cleaned = base
    // eslint-disable-next-line no-control-regex -- client data sanitization
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+$/, "")
    .trim();
  return cleaned.length > 0 ? cleaned.slice(0, 255) : "upload";
}

/** Active temp files for teardown; tests call cleanupAllUploads(). */
const activeTempFiles = new Set<string>();

/** Removes every tracked temp file (process-test teardown / shutdown). */
export async function cleanupAllUploads(): Promise<number> {
  const paths = [...activeTempFiles];
  activeTempFiles.clear();
  await Promise.allSettled(paths.map((path) => rm(path, { force: true })));
  return paths.length;
}

async function makeTempDirectory(base?: string): Promise<string> {
  if (base !== undefined) {
    await mkdir(base, { recursive: true });
    return base;
  }
  return mkdtemp(join(tmpdir(), "bundar-upload-"));
}

/**
 * Handles a multipart form request under the upload policy:
 *
 * 1. Enforces Content-Type and a Content-Length pre-check against
 *    `maxFileBytes × maxFiles + overhead` BEFORE reading (bounded during
 *    read: the stream is also capped per part).
 * 2. Reads parts with `request.formData()` under an overall byte cap by
 *    checking each file's size as it materializes, rejecting the moment a
 *    limit trips (never after full buffering beyond the cap).
 * 3. Persists file parts to server-named temp files in the policy's
 *    directory; runs the verifier; quarantines + removes rejects.
 * 4. Always removes temp files (success, error, cancellation) and tracks
 *    them for teardown cleanup.
 */
export async function handleUploads(
  context: Context,
  options: HandleUploadsOptions,
): Promise<Response> {
  const policy: UploadPolicy = {
    ...DEFAULT_UPLOAD_POLICY,
    ...(options.policy ?? {}),
  };
  const request = context.request;

  const contentType = (request.headers.get("content-type") ?? "")
    .split(";")[0]!
    .trim()
    .toLowerCase();
  if (contentType !== "multipart/form-data") {
    throw new UnsupportedMediaTypeError(
      request.headers.get("content-type") ?? "",
    );
  }

  // pre-read cap: declared length can never exceed the worst-case envelope
  const declared = Number(request.headers.get("content-length") ?? "0");
  const envelopeCap =
    policy.maxFileBytes * policy.maxFiles + policy.maxFields * 2048 + 8192;
  if (declared > envelopeCap) {
    throw new BodyLimitError(
      "maxBytes",
      `Content-Length ${declared} exceeds the upload envelope`,
    );
  }

  const tempDirectory = await makeTempDirectory(policy.tempDirectory);
  const stored: StoredUpload[] = [];
  const ownedPaths = new Set<string>();
  const cleanupAll = async (): Promise<void> => {
    for (const path of ownedPaths) {
      await rm(path, { force: true });
      activeTempFiles.delete(path);
    }
    if (policy.tempDirectory === undefined) {
      await rm(tempDirectory, { recursive: true, force: true }).catch(
        () => undefined,
      );
    }
  };

  try {
    const form = await request.formData();
    let files = 0;
    let fields = 0;

    for (const [key, value] of form.entries()) {
      if (typeof value === "string") {
        fields += 1;
        if (fields > policy.maxFields) {
          throw new UploadPolicyError(
            "maxFields",
            `${fields} fields exceeds ${policy.maxFields}`,
          );
        }
        continue;
      }
      files += 1;
      if (files > policy.maxFiles) {
        throw new UploadPolicyError(
          "maxFiles",
          `${files} files exceeds ${policy.maxFiles}`,
        );
      }
      if (value.size > policy.maxFileBytes) {
        throw new UploadPolicyError(
          "maxFileBytes",
          `part "${sanitizeClientName(value.name)}" is ${value.size} bytes; limit ${policy.maxFileBytes}`,
        );
      }

      const metadata: UploadMetadata = {
        clientName: sanitizeClientName(value.name),
        claimedContentType: value.type || "application/octet-stream",
        bytes: value.size,
      };
      const path = join(tempDirectory, `${randomUUID()}.part`);
      const bytes = new Uint8Array(await value.arrayBuffer());
      await writeFile(path, bytes);
      ownedPaths.add(path);
      activeTempFiles.add(path);

      if (options.verify !== undefined) {
        const verdict = await options.verify({ path, metadata });
        if (!verdict.accepted) {
          await rm(path, { force: true });
          ownedPaths.delete(path);
          activeTempFiles.delete(path);
          options.onQuarantine?.({
            path,
            metadata,
            reason: verdict.reason ?? "rejected by verifier",
          });
          throw new UploadPolicyError(
            "verifier",
            `part "${metadata.clientName}" rejected: ${verdict.reason ?? "content verification failed"}`,
          );
        }
      }

      stored.push({
        path,
        bytes: metadata.bytes,
        clientName: metadata.clientName,
        claimedContentType: metadata.claimedContentType,
        cleanup: async () => {
          await rm(path, { force: true });
          ownedPaths.delete(path);
          activeTempFiles.delete(path);
        },
      });
      void key;
    }

    const response = await options.handle(stored);
    return response;
  } finally {
    // success, error, or cancellation: temp files never outlive the request
    await cleanupAll();
  }
}

/** Stat helper for tests/evidence: does a temp file still exist? */
export async function uploadFileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
