# Trust boundaries

Each boundary states: what crosses it, where the framework enforces it,
and which machine-checked guard holds the line. "Application
responsibility" items are promises the framework deliberately does NOT
make — the reviewer should verify the docs say so and the code agrees.

## TB1 — Untrusted text → HTML output

- Crossing: any value rendered as text, attribute value, RCDATA, or raw
  markup by the server renderer.
- Enforcement: default entity encoding (`packages/jsx/src/escape.ts`,
  `render/primitive.ts`); attribute-value escaping plus attribute-name
  validation and per-class URL-scheme checks (`render/attributes.ts`);
  closing-sequence neutralization for `script`/`style`/`textarea`/`title`
  (`render/elements.ts`); unbranded objects in text positions fail
  closed (`render/node.ts`).
- The single verbatim sink is `raw()` (`packages/jsx/src/raw.ts`),
  branded by a module-private symbol; the documented inventory of all
  sinks is `docs/security/sink-inventory.md`, machine-checked by
  `tools/security/sink-audit.ts` (production `raw()` sites outside the
  registered allowlist fail the build).
- Application responsibility: sanitization of anything passed to
  `raw()`; CSS property injection inside one declaration; `--` inside
  comments.

## TB2 — Network bytes → parsed request

- Crossing: request bodies (JSON, urlencoded, multipart), encodings,
  field/file counts.
- Enforcement: limits pre-checked from Content-Length against the
  worst-case envelope and re-checked during the read in
  `packages/core/src/request/body.ts`; oversized parts reject mid-read;
  malformed encodings fail rather than coerce.
- Review questions: duplicate-field semantics per parser, header-size
  handling, content-type sniffing trust, decompression behavior.

## TB3 — Client file metadata → filesystem

- Crossing: multipart filenames, claimed content types, file counts and
  sizes.
- Enforcement: `sanitizeClientName` strips path components/traversal/
  control bytes; temp paths are `<tempDirectory>/<uuid>.part` so client
  names never select destinations (`packages/core/src/request/upload.ts`);
  per-part caps trip mid-read; temp files are cleaned on success,
  failure, rejection, and cancellation.
- Application responsibility: content validation (`verify` hook is
  mandatory in production posture), malware scanning, serving uploads
  from a separate origin (`docs/guides/uploads.md`).

## TB4 — Browser cookie → identity

- Crossing: the session cookie.
- Enforcement: cookie carries only an opaque 256-bit id
  (`session/id.ts`); unknown/expired/malformed ids get a fresh anonymous
  session (no resurrection); rotation issues a fresh id and destroys the
  old record atomically when the store has the `atomicRotate` capability
  (`session/store.ts`, `session/middleware.ts`); cookie attribute
  validation rejects `SameSite=None` without `Secure` and enforces
  `__Host-` rules (`cookies.ts`); `Secure` derives from the NORMALIZED
  origin — production http fails hard (`proxy.ts`, posture checks).
- Review questions: duplicate cookies in one request, expiry race
  windows, non-atomic fallback path (documented weaker: destroy-then-
  commit), store serialization guard.

## TB5 — Cross-site request → state mutation

- Crossing: any unsafe-method request.
- Enforcement: synchronizer tokens bound to `session.id` with three-way
  agreement (origin evidence + cookie token + submitted token, the last
  two verified against the session binding AND each other), fail-closed
  generic 403, rotation on success and invalidation on session rotation
  (`packages/security/src/csrf.ts`); origin/referer validation derives
  from the normalized origin, not raw `Host` (`proxy.ts`).
- Review questions: token consumption races on concurrent submits,
  logout vs in-flight requests, subdomain/origin parsing edge cases,
  timing-safe comparisons.

## TB6 — Proxy/header evidence → origin and URL facts

- Crossing: `X-Forwarded-*`, `Host`, `Referer`/`Origin`.
- Enforcement: explicit proxy-trust configuration; origin normalization
  (documented as ADR-0020 in `docs/guides/sessions.md` and
  `docs/guides/deployment.md`); redirect URLs pass structural
  validation and a no-injection scan (`packages/core/src/response.ts`,
  `tools/security/redirects-audit.ts`).
- Application responsibility: open-redirect policy (framework validates
  structure, not intent).

## TB7 — Internal failure → external response

- Crossing: exceptions, stack traces, request details.
- Enforcement: expected failures keep a public envelope; unexpected
  failures are opaque 500s in production; stacks only in development
  (`error-boundary.ts`, `sanitizeStack`); one redaction boundary —
  sensitive keys, path-like strings, correlation IDs
  (`error-redaction.ts`); enhanced (htmx) error responses never include
  protected content and authorization reads only the session, never
  htmx headers (`docs/guides/security.md`, admin posture suite).
- Review questions: redaction bypass via unexpected shapes, log-vs-
  response asymmetry, error-id correlation leaks.

## TB8 — Untrusted code → CI and secrets

- Crossing: pull requests from forks.
- Enforcement: GH-169/GH-171 runner trust split — PRs run on ephemeral
  GitHub-hosted VMs; push-to-main (trusted) may use the maintainer-
  hosted `halotec` runner (`.github/workflows/ci.yml` and every
  workflow's `runs-on` selection); least-privilege `permissions:` per
  workflow; the release workflow never publishes (manual trigger,
  uploads evidence only).
- Review questions: whether any workflow accepts untrusted artifact
  names/branches in `runs-on` or script interpolation; whether
  `pull_request_target` appears anywhere; secret exposure surface.

## TB9 — Downloaded bytes → publication

- Crossing: the candidate bundle travels from CI to the publishing
  machine.
- Enforcement: the battery-uploaded bundle is the authoritative
  candidate; `candidate-identity.json` pins workflow SHA, manifest
  SHA-256, and all nine tarball SHA-256 values; the strict shared
  loader (schema, exact-set, containment, byte-hash, packed identity)
  gates publisher, release:verify, and registry:verify alike;
  post-publish byte verification compares registry bytes to the
  candidate; `--dry-run` is parsed before any credential check.
  Human gates: publishing requires maintainer execution (GH-130
  procedure; GH-132 live canary still pending — the guide is
  provisionally draft, see `docs/maintainers/publishing.md`).
- Review questions: whether any path can publish bytes that were never
  hash-verified against the identity record; dist-tag rules (`latest`
  never a prerelease before 1.0); rollback/deprecation tooling
  completeness.
