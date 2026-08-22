# GH-064 verification transcript — multipart upload policy and safe temp files

## Issue

[GH-064 — Implement multipart upload policy and safe temporary-file
handling](../../issues/m4/gh-064-implement-multipart-upload-policy-and-safe-temporary-file-handling.md)
(branch `gh-064-uploads`, worktree `bundar-gh-064`, base commit `970f1a9` =
main after the GH-060 merge).

## Environment (exact versions)

- Bun `1.4.0` (multipart via the platform `formData()` parser); TypeScript
  `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/core `0.0.0` (77 runtime exports after this change; zero runtime
  dependencies unchanged).
- htmx: not involved. OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `packages/core/src/request/upload.ts` (new):
  - `UploadPolicy` (frozen defaults: 10 MiB/file, 10 files, 100 fields) —
    per-route may tighten only.
  - `handleUploads(context, options)`: Content-Type and worst-case-envelope
    Content-Length pre-check BEFORE reading; per-part byte/count/field caps
    enforced DURING iteration (never buffer-then-check); file parts persist
    to a fresh temp directory under server-generated `<uuid>.part` names
    (client filenames can never select paths); the verifier hook
    (`verify`) runs per file after bytes land and before handlers see
    them — rejects are deleted, surfaced via the `onQuarantine` hook, and
    fail the request; temp files removed on success, handler error,
    policy/verifier rejection, and cancellation (`finally`), plus a
    registry backing `cleanupAllUploads()` for teardown.
  - `sanitizeClientName()`: basename-only display names — path segments
    (both separators), traversal sequences, and control bytes never
    survive; 255-char cap; "upload" fallback.
  - `StoredUpload` carries `path` (server-controlled), `bytes`,
    `clientName` (untrusted display), `claimedContentType` (client-declared
    — platform parsers may normalize; documented), and idempotent
    `cleanup()`.
- Tests: `packages/core/test/uploads/upload.test.ts` (14) — sanitization
  matrix, upfront content-type rejection, pre-read envelope rejection,
  per-part byte cap, file/field count caps (duplicate fields counted),
  server-named storage with untrusted metadata, temp-file removal on
  success/handler-throw, custom temp directories, quarantine flow
  (file removed + hook fired + request failed), accepted-verify flow,
  teardown registry, truncated-multipart fail-closed, defaults.
- `tools/security/uploads-audit.ts` + `security:uploads` script: fail-closed
  audit (path selection impossible; limits during read; lifecycle on every
  path; quarantine removes + alerts; teardown drains; guide requirements).
- `docs/guides/uploads.md` (new): the contract, during-read limits,
  untrusted-metadata semantics, temp lifecycle, and the PRODUCTION
  requirement (content sniffing vs claimed type + malware scanning
  appropriate to risk; separate origin; nosniff/attachment serving).
- Core export snapshot 71 → 77 (deliberate; `api:check` green).

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun test packages/core/test/uploads/**` (as
   `bun test ./packages/core/test/uploads`) — exit 0; 14 tests, 38 expect()
   calls, 0 fail.
3. `bun run security:uploads` — exit 0 (all seven audit groups pass).
4. `bun run --filter @bundar/core typecheck`, root `bun run typecheck` —
   exit 0.
5. `bun run lint`, `bun run format:check` — exit 0.
6. `bun test` (full) — exit 0; 581 tests across 70 files, 0 fail, 7,642
   expect() calls.
7. `bun run architecture:check` — exit 0 (67 source files). `bun run
   pack:inspect @bundar/core` — exit 0 (zero runtime deps). `bun run
   api:report` + `api:check` — exit 0 (77 exports). `bun run build` —
   exit 0. `bun run docs:validate` (214 documents) / `docs:links` — exit 0.

### Tooling decisions

- The planned `bun run test:leaks -- uploads` runner does not exist; leak
  coverage is direct and deterministic: lifecycle tests assert temp files
  are removed after success, handler errors, policy rejections, and
  quarantine, plus the teardown-registry drain (audit re-proves).
- `security:uploads` was added verbatim as the planned audit command.

## Acceptance evidence mapping

- "Limits are enforced during read rather than after full buffering" — the
  Content-Length envelope pre-check rejects before any byte is read;
  per-part caps reject the moment a limit trips (tests + audit).
- "Temporary files are removed on success, error, cancellation, and
  process-test teardown" — the four lifecycle tests + registry drain +
  audit re-proof.
- "Paths cannot be selected by client filenames" — sanitizeClientName
  matrix (unix/windows/traversal/control) + storage-path assertions (uuid
  names; no client segments) + audit.
- "Production guide requires content validation and scanning appropriate
  to risk" — `docs/guides/uploads.md` states the mandate; the audit fails
  closed if the text disappears.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — every command exit 0; nothing skipped.
- OKF/log updates — uploads guide, closure record, `issues/m4/index.md`,
  `log.md`, this transcript, regenerated API snapshot.

## Residual risks

- Bun's `formData()` buffers each part before the size check can run — the
  envelope pre-check bounds total memory, and per-part caps reject
  immediately, but a single part up to `maxFileBytes` is materialized in
  memory before persistence (documented; the platform offers no
  streaming-multipart API today).
- `claimedContentType` may be normalized by the platform parser — it is
  recorded as claimed either way; the guide mandates sniffing.
- Object storage and malware engines remain app territory (out of scope by
  design); `verify`/`onQuarantine` are the integration points.

## Newly unblocked

- GH-068 (forms/security matrix — now awaits only GH-063 and GH-066).
