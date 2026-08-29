# Test inventory

What already exists, organized by review area, so the reviewer can read
tests as specifications and find the gaps rather than re-derive
coverage. Everything below runs with `bun test` (full suite) or the
listed scripts. File lists are abbreviated to directories whose names
carry the meaning; read the files for specifics.

## Escaping / renderer (TB1)

- `packages/jsx/test/security/` — `raw-html.test.ts`,
  `raw-html-forgery.test.ts` (brand cannot be forged via Symbol.for,
  spread, JSON, prototype), `attribute-injection.test.ts`.
- `packages/jsx/test/text-rendering.test.ts`, `attributes/`,
  `components/`, `conformance/`, `document/`, `forms/`.
- `packages/jsx/test/async/`, `streaming/` — async resolution, streamed
  chunks, late-error behavior.
- `packages/jsx/test/fuzz/` — structured fuzzing of the renderer.
- Corpus tool: `tools/security/jsx-corpus.ts` (`security:jsx`).

## Request handling / uploads (TB2, TB3)

- `packages/core/test/body/`, `body-limits/`, `request-data/` — parsing,
  duplicate fields, limits tripping mid-read.
- `packages/core/test/uploads/` — policy enforcement, filename
  sanitization, temp-file lifecycle, quarantine.
- `packages/core/test/http-methods/`, `routing/`, `responses/` — method
  semantics, matching, response composition.
- `packages/core/test/abort/`, `concurrency/`, `lifecycle/` — cancel and
  cleanup behavior.
- `tests/fuzz/fuzz.test.ts`, `tests/property/invariants.test.ts` +
  `seeded.ts` — cross-cutting invariants under generated input.

## Sessions / CSRF / cookies / headers (TB4, TB5, TB6)

- `packages/security/test/csrf/`, `cookies/`, `csp/`, `headers/`.
- `packages/security/test/session/`, `sessions/`,
  `session-error-classification.test.ts`.
- `packages/security/test/session-store-contract/` — the conformance
  suite every durable store adapter must pass (atomic rotate, expiry,
  serialization guard).
- `packages/security/test/production-posture.test.ts` — insecure
  constructions fail.
- `packages/security/test/proxy-contract.test.ts` — proxy-trust and
  normalized origin.
- `packages/security/test/flash.test.ts` — single consumption.

## Form workflow / transaction semantics

- `packages/forms/test/run-executable-form-action.test.ts` — executor
  sequence, event order, abort-during-render rollback, exactly-once.
- `packages/forms/test/forms.test.ts` — contract drift pin; `sources.test.ts`;
  `invalid-field.test.ts`; `types/` — compile-time proofs.
- `packages/htmx/test/form-action-conformance.test.ts` — differential
  suite: legacy executor vs separated facade, byte-level response
  equality across 12 paired scenarios.
- `tools/security/validation-redaction.ts` (`security:validation-redaction`)
  — retained-value redaction audit.

## HTTP semantics / cache / errors (TB6, TB7)

- `tests/proxy-cache/poisoning.test.ts` + `simulated-proxy.ts` — cache
  poisoning and Vary behavior behind a proxy.
- `packages/core/test/errors/`, `packages/htmx/test/error-negotiation/`.
- `packages/htmx/test/cache/`, `response-directives/`,
  `request-normalization/`, `request-headers.test.ts`.
- `tools/security/cache-audit.ts`, `headers-audit.ts`,
  `cookies-audit.ts`, `csrf-audit.ts`, `redirects-audit.ts`,
  `response-hygiene-audit.ts`, `uploads-audit.ts` — nine fail-closed
  audits, one command: `bun run test:security`; posture report:
  `bun run security:report`.

## Supply chain (TB8, TB9)

- `tests/release/candidate-authority.test.ts` — single-authority
  candidate identity record.
- `tests/release/candidate-integrity.test.ts` — manifest/tarball digest
  binding.
- `tests/release/publisher-safety.test.ts` — dry-run-before-credentials,
  manifest-acceptance gates.
- `tests/release/workflow-security.test.ts` — workflow trust properties
  (runner selection, permissions, no publish on PRs).
- `tests/release/release-plan.test.ts`; `tools/release/verify.ts`
  (`release:verify`, 42 go/no-go checks); `registry-verify.ts`
  (preflight + post-publish byte checks).
- End-to-end rehearsal: `bun run publish:approved -- --dry-run`
  (proven exit 0, "NOTHING was published") and Model B rehearsal from
  the downloaded battery bundle (see `log.md` entries for the latest
  bundle digest).

## Whole-application posture

- `examples/admin-crud/src/security.test.ts` (`security:example-admin`)
  — the reference posture suite (403 without session regardless of htmx
  headers, CSRF failures, redaction).
- `tests/e2e/`, `tests/consumer/`, `tests/browser/` — journey-level
  checks including no-JS and enhanced lanes.
- `tests/architecture/boundary-harness.test.ts` + `tools/architecture-check/`
  — package boundary violations fail.

## Reading order suggestion

1. Run `bun run security:report` — the generated posture report.
2. For each review area: read the documented guarantee, then the audit
   tool, then the tests, then the implementation.
3. Where a guarantee has an audit but no test (or vice versa), that
   asymmetry is itself a finding candidate.
