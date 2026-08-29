# Architecture map for the security review

Bundar is a Bun-native server framework published as eight workspace
packages under `packages/`. Applications compose them; the framework's
security posture lives at the seams. Paths below are the security-load-
bearing files; every claim in the packet's other documents refers to
this map.

## Package boundary (architecture guard enforced)

- `@bundar/core` — HTTP server, routing, request/response, errors.
- `@bundar/jsx` — server renderer (escaping, streaming).
- `@bundar/schema` — Standard Schema v1 validation contract.
- `@bundar/forms` — neutral validated form-action workflow (parse →
  validate → run → fragment), transaction exactly-once semantics.
- `@bundar/htmx` — htmx delivery adapter (headers, fragments, OOB).
- `@bundar/security` — sessions, CSRF, cookies, headers, proxy, posture.
- `@bundar/testing` — in-process browser-semantics test client.
- `@bundar/cli` — dev/preflight tooling.

Boundary tests: `tests/architecture/boundary-harness.test.ts`,
`tools/architecture-check/` (`bun run architecture:check`).

## JSX / rendering (`packages/jsx/src/`)

| File | Security role |
| --- | --- |
| `escape.ts` | HTML entity escaping primitives |
| `raw.ts` | the ONLY verbatim-markup sink; module-private brand symbol |
| `render/node.ts` | child resolution; rejects unbranded objects (fail closed) |
| `render/primitive.ts` | text/number serialization (entity-encoding) |
| `render/attributes.ts` | attribute serialization, name validation, class/style models, URL-scheme checks |
| `render/elements.ts` | RCDATA/raw-text elements (`script`, `style`, `textarea`, `title`) closing-sequence neutralization |
| `render/async.ts`, `render-to-stream.ts` | async components, streamed chunks, late errors |
| `document.ts` | document shell (lang, title, error regions) |

Documented sink inventory: `docs/security/sink-inventory.md` (13 sinks,
each with owner/encoding/tests/residual risk). Audits:
`tools/security/sink-audit.ts` (`security:sinks` — Rules A/B),
`tools/security/raw-html-audit.ts`.

## HTTP core (`packages/core/src/`)

| File | Security role |
| --- | --- |
| `request/body.ts` | JSON/urlencoded/multipart parsing, limits during read |
| `request/upload.ts` | upload policy, `sanitizeClientName`, temp-file lifecycle, quarantine |
| `request/adapters.ts` | platform request adapter |
| `request-abort.ts` | abort signal propagation |
| `response.ts`, `response-mutate.ts` | response composition, header helpers, redirect emission |
| `error-boundary.ts`, `errors.ts` | error envelope, error-code registry, correlation IDs |
| `error-redaction.ts` | production redaction (sensitive keys, path-like strings, stacks) |
| `routing/compiler.ts`, `routing/path.ts`, `routing/conflicts.ts` | route compilation, matching, conflict detection |
| `middleware.ts`, `lifecycle.ts`, `context.ts`, `app.ts` | composition, request context |

## Sessions / CSRF (`packages/security/src/`)

| File | Security role |
| --- | --- |
| `session/id.ts` | 256-bit opaque session-id generation |
| `session/store.ts` | `SessionStore` contract (load/commit/destroy), capability flags (`durable`, `atomicRotate`, `touch`), serialization guard |
| `session/middleware.ts` | attach/load/rotate/destroy, cookie issuance, expiry model |
| `csrf.ts` | synchronizer token issue/verify (three-way agreement), rotation on success |
| `cookies.ts` | cookie serialization, attribute validation (`__Host-` rules, SameSite/Secure) |
| `headers.ts` | `securityHeaders()` mandatory baseline (nonce CSP, nosniff, Referrer-Policy, Permissions-Policy, COOP, HSTS) |
| `proxy.ts` | proxy trust configuration, normalized origin derivation |
| `posture.ts` | production posture checks (rejects insecure construction) |
| `flash.ts` | single-consumption flash messages |

## Form workflow (`packages/forms/src/`)

| File | Security role |
| --- | --- |
| `sources.ts` | bounded submission parsing from request sources |
| `validation.ts` | Standard Schema invocation, issue normalization, caps |
| `run-executable-form-action.ts` | separated executor: checkpoint/parse/validate/begin/run/fragment/commit; rollback exactly-once |
| `run-form-action.ts` | legacy-compatible executor (same semantics; kept until equivalence window ends) |
| `invalid-field.ts` | field-error views with safe retained values |
| `contracts.ts` | public contracts (versioned; drift-tested) |

Redaction of retained values is owned upstream of field views — see
`tools/security/validation-redaction.ts` (audit) and
`docs/guides/validation.md`.

## htmx delivery (`packages/htmx/src/`)

`dialects/v2` (default, pinned `2.0.10`), `dialects/v4`
(experimental beta), `action.ts` / `form-action-facade.ts` (form-action
delivery), `error-view.ts` / `error-document.ts` (error negotiation),
`updates.ts` (OOB intents — the single registered production `raw()`
site), `directives.ts` (event-name validation, `HX-*` header writes —
the only allowed writer), `cache-policy.ts` (`Vary` negotiation).
Guard: `tools/source-diff.ts` (`htmx:source-diff`) fails raw `HX-*`
literals outside the dialect adapter.

## Release supply chain

| Piece | Role |
| --- | --- |
| `tools/release/pack-release.ts`, `publish-dry-run.ts` | candidate packing, manifest (per-tarball SHA-256), 42-check dry-run |
| `tools/release/candidate-identity.ts`, `candidate-manifest-loader.ts` | strict shared loader; identity record binding workflow SHA + manifest digest + nine tarball digests |
| `tools/release/registry-verify.ts` | preflight (bytes vs manifest) + post-publish (registry bytes vs candidate) verification |
| `tools/release/reproduce.ts`, `sbom.ts`, `provenance.ts`, `verify.ts` | byte-identical rebuild proof, SBOM, provenance attestation, go/no-go preconditions |
| `tools/release/publish-approved.ts` | the only publication path; `--dry-run` exits before credential check |
| `.github/workflows/` | `ci.yml` (GH-169/GH-171 runner trust split), `candidate-release.yml` (public battery; uploads THE authoritative bundle), docs workflows |
| `tests/release/` | `candidate-authority`, `candidate-integrity`, `publisher-safety`, `release-plan`, `workflow-security` tests |

Model B rule: the battery-uploaded bundle is the single authoritative
candidate; publication may consume only downloaded bundle bytes
(`--manifest` + `--tarball-root` together). See
`docs/maintainers/publishing.md` — currently **status: draft,
provisional until the first live canary** (GH-178 stage 2).

## Cross-cutting evidence

- `docs/security/raw-html.md` — the raw-HTML guarantee and audit.
- `docs/guides/security.md`, `docs/guides/sessions.md`,
  `docs/guides/uploads.md` — the documented posture (drift-tested).
- `tools/security/test-matrix.ts` (`test:security`) — the nine
  fail-closed audits in one command.
- `log.md` — per-wave engineering evidence, including every battery run
  and its bundle digest.
