# GH-059 verification transcript — validation results and field-error rendering data

## Issue

[GH-059 — Define validation results and field-error rendering
data](../../issues/m4/gh-059-define-validation-results-and-field-error-rendering-data.md)
(branch `gh-059-validation-results`, worktree `bundar-gh-059`, base commit
`a2751a1` = main after the GH-058 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/schema `0.0.0`, @bundar/jsx `0.0.0` (no new dependencies; jsx
  consumes the error model structurally — the frozen boundary forbids a
  jsx→schema import).
- htmx: not involved. OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `packages/schema/src/issues.ts` (new): `toFieldErrors()` — failed results
  become stable rendering data: per-field message lists (multiple errors
  preserved in issue order), form-level globals (empty-path issues) kept
  distinct, deterministic first-appearance `order`, nested paths mapped to
  dot-joined addressable ids (`items.0.name`), `first` (first error per
  field, summary input), `field()`/`has()` accessors that never return
  undefined, `empty`; `submitted` retains only safe values — the 19-key
  `SENSITIVE_FIELD_KEYS` policy (passwords, tokens, secrets, payment data,
  session, …) plus caller `redactKeys` drop sensitive keys entirely, and
  non-primitive values (files/bytes/objects) are never retained.
  `redactSubmitted()` applies the same policy standalone. A successful result
  fails closed with TypeError instead of rendering nonsense.
- `packages/jsx/src/forms/error-summary.ts` (new): `ErrorSummary()` —
  accessible summary (`role="alert"`, `aria-labelledby` heading, first error
  per field as anchor links `#<field-anchor>`, dot paths → dash ids with
  optional `targetPrefix`, globals as plain list items); renders nothing for
  an empty model; all messages escaped. `fieldAnchorId()` exported for the
  matching field-id convention.
- `packages/schema/test/issues/issues.test.ts` (new, 11 tests) and
  `packages/jsx/test/forms/error-summary.test.ts` (new, 6 tests).
- `tools/security/validation-redaction.ts` (new) + root script
  `security:validation-redaction`: fail-closed audit planting a distinct
  secret in every sensitive key and asserting none survive into the
  serialized model, byte content dropped, safe values kept, and zero direct
  logging calls in schema/jsx sources.
- Exports wired in both package indexes; `docs/guides/validation.md` gained
  the rendering section.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0 (no dependency changes).
2. `bun test ./packages/schema` — exit 0; 26 tests (15 from GH-058 + 11 new),
   0 fail.
3. `bun test ./packages/jsx/test/forms` — exit 0; 6 tests, 0 fail.
4. `bun run security:validation-redaction` — exit 0; "19 sensitive keys
   planted and absent; byte content dropped; no direct logging in schema/jsx
   sources".
5. `bun run --filter @bundar/schema typecheck` and
   `--filter @bundar/jsx typecheck` and root `bun run typecheck` — exit 0.
6. `bun run lint`, `bun run format:check` — exit 0.
7. `bun test` (full) — exit 0; 434 tests across 54 files, 0 fail, 3,133
   expect() calls.
8. `bun run architecture:check` — exit 0 (53 source files; jsx still imports
   no Bundar package).
9. `bun run pack:inspect @bundar/schema`, `@bundar/jsx` — exit 0.
10. `bun run build` — exit 0. `bun run docs:validate` (210 documents) and
    `bun run docs:links` (1,088 links) — exit 0.

### Tooling decisions

- The planned `bun test packages/schema/test/issues/**` and
  `packages/jsx/test/forms/error-summary.test.tsx` paths are honored as
  `.ts` files (both packages write components/tests with `jsx()` calls rather
  than `.tsx` syntax; the file-extension difference is the only deviation).
- The planned `bun run security:validation-redaction` command was added
  verbatim as a new script (no substitution needed).

## Acceptance evidence mapping

- "Multiple errors per field are preserved" — issue-order lists per field,
  asserted with two messages on one field.
- "Global/form-level errors are distinct from field errors" — empty-path
  issues land in `global`, never in `fields`.
- "Sensitive values never appear in logs or default rendered models" —
  runtime unit tests + the audit script's planted-secret sweep; static rule:
  no direct logging calls in either package's sources.
- "Error ordering is deterministic and accessible summary links can target
  fields" — order/first assertions plus anchor-id convention
  (`items.0.name` → `#items-0-name`) asserted from both sides.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — every command exit 0; nothing skipped.
- OKF/log updates — closure record below, `issues/m4/index.md`, `log.md`,
  guide section, this transcript.

## Residual risks and deviations

- Redaction matches by key name (any path segment), the documented policy;
  a sensitive value under an innocent key still renders — callers can add
  `redactKeys`, and the audit keeps the default list pinned.
- Retained primitives are stringified (`3` → `"3"`, `true` → `"true"`) so
  re-rendered inputs are always HTML-safe text; documented in the guide.
- `ErrorSummary` intentionally renders only the first error per field (the
  accessible-summary pattern); full lists stay available on the model.

## Newly unblocked

- GH-060 (progressive validated form actions) and GH-065 (page vs fragment
  error negotiation).
