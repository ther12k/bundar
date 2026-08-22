# Uploads guide

File uploads are bounded, explicit, and untrusting by construction
(GH-064).

## The contract

```ts
import { handleUploads } from "@bundar/core";

app.post("/uploads", (context) =>
  handleUploads(context, {
    policy: { maxFileBytes: 5 * 1024 * 1024, maxFiles: 3 },
    verify: async ({ path, metadata }) =>
      (await sniffContent(path)) === metadata.claimedContentType
        ? { accepted: true }
        : { accepted: false, reason: "content/type mismatch" },
    onQuarantine: ({ metadata, reason }) => alertSecurity(metadata, reason),
    handle: async (uploads) => {
      for (const upload of uploads) {
        await objectStore.put(serverKey(), upload.path);
      }
      return redirect("/uploads", { status: 303 });
    },
  }),
);
```

## Limits are enforced during the read

Content-Length is pre-checked against the worst-case envelope
(`maxFileBytes × maxFiles + field overhead`) BEFORE any byte is read, and
every part is capped — an oversized part rejects the moment the limit
trips, never after buffering the whole thing. Field and file counts cap
during iteration.

## Filenames and MIME types are untrusted

`upload.clientName` is a sanitized BASENAME for display only — path
components, traversal sequences, and control bytes never survive
(`sanitizeClientName`). The temp path is always
`<tempDirectory>/<uuid>.part` — a client filename can never select where a
file lands. `claimedContentType` is exactly what the client declared
(platform parsers may normalize common types); sniff actual content before
trusting it.

## Temp-file lifecycle

Parts land in a fresh OS temp directory per request (or your
`policy.tempDirectory`). Files are removed on success, on handler errors,
on policy/verifier rejection, and on cancellation; a registry backs
`cleanupAllUploads()` for process teardown. Handlers that need persistence
must copy/move bytes inside `handle` — the temp file is gone after.

## Production requirements

**Content validation is mandatory in production**: pass a `verify` hook
that sniffs magic bytes against the claimed type and runs malware scanning
appropriate to your risk profile (ClamAV, vendor APIs — Bundar ships no
engine by design). Rejected uploads are deleted and surfaced through
`onQuarantine` for alerting. Serve user uploads from a separate origin,
never inline-sniffed as HTML, with `Content-Disposition: attachment` and a
`X-Content-Type-Options: nosniff` equivalent — and never trust
`claimedContentType` for storage keys or access decisions.
