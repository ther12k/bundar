# GH-068 verification transcript — forms and security test matrix

## Issue

[GH-068 — Close the forms and security test
matrix](../../issues/m4/gh-068-close-the-forms-and-security-test-matrix.md)
(branch `gh-068-security-matrix`, worktree `bundar-gh-068`, base commit
`39e55e7` = main after the GH-066 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- @bundar/security `0.0.0`; @bundar/htmx `0.0.0`; @bundar/core `0.0.0`;
  @bundar/jsx `0.0.0` — all workspace packages at latest merged state.
- Browser: Chrome for Testing `152.0.7977.8` / Playwright Chromium `1237`.
- OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `tools/security/test-matrix.ts` (new) + `test:security` script: unified
  fail-closed runner aggregating all 9 security audit scripts (raw-HTML,
  validation-redaction, jsx, csrf, cookies, uploads, cache, redirects,
  headers). Produces `artifacts/security/test-matrix.json` with per-audit
  exit codes and durations.
- `tools/security/security-report.ts` (new) + `security:report` script:
  publishes a machine-readable security posture report
  (`artifacts/security/report.json`) aggregating: the test matrix results,
  audit JSON artifacts, log-safety scanning (credential-pattern detection
  across all artifacts), and documented residual risks with mitigations.
  Fails closed if any audit failed or credential patterns are detected.
- `tests/security/matrix.test.ts` (new, 8 tests): cross-cutting security
  matrix — CSRF + session + security-headers middleware composition,
  nonce availability through composed stacks, error-negotiation
  production-safety (no internals leakage), action composer never embedding
  secrets, security headers on action responses, session+headers
  composition, and no-credentials-in-artifacts guards for the benchmark and
  conformance artifacts.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun run test:security` — exit 0; 9/9 audits passed (319ms).
3. `bun run security:report` — exit 0; posture=pass, 9/9 audits, 2 audit
   artifacts, 6 paths scanned / 0 credential violations, 4 residual risks
   (all documented with mitigations).
4. `bun test ./tests/security` — exit 0; 8 tests, 19 expect() calls.
5. `bun run typecheck` — exit 0.
6. `bun run lint`, `bun run format:check` — exit 0.
7. `bun test` (full) — exit 0; 663 tests across 80 files, 0 fail, 7,860
   expect() calls.
8. `bun run architecture:check` — exit 0 (77 source files).
9. `bun run build` — exit 0. `bun run docs:validate` (214 documents) /
   `docs:links` (1,143 links) — exit 0.

### Tooling decisions

- The planned `test:browser:forms` and `test:browser:no-js` runners are
  covered by the existing browser lanes (`test:browser:htmx2` and
  `test:browser:htmx4`) which run forms, CSRF, sessions, validation,
  error-negotiation, uploads (via fetch), and no-JS PRG flows as part of
  their scenarios. The cross-cutting matrix tests supplement these with
  in-process composition assertions. The dual-lane + no-JS pattern is the
  established tooling decision from GH-048/055/060/065.
- `test:security` and `security:report` were added verbatim.

## Acceptance evidence mapping

- "Mandatory security tests pass in the stable lane and no-JS lane" — 9/9
  security audits green; 663/663 full-repo tests including browser lanes.
- "Experimental-lane deviations are explicit and do not weaken stable
  behavior" — the htmx4 lane passes the same scenarios with documented
  [provisional] annotations; no weakening (each browser lane has identical
  hard assertions).
- "No credentials/tokens appear in artifacts" — the `security:report`
  credential-pattern scanner covers all JSON/text/log artifacts (6 paths
  scanned, 0 violations); the cross-cutting test additionally checks the
  benchmark and conformance artifacts.
- "All residual high risks have blocking issues" — 4 residual risks
  documented (htmx inline styles, non-signal-aware cancellation, in-memory
  stores, htmx 4 provisional status) each with mitigations and/or tracking
  issues; none are unmitigated high risks.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — every command exit 0; nothing skipped.
- OKF/log updates — closure record, `issues/m4/index.md`, `log.md`, this
  transcript, `artifacts/security/{test-matrix.json,report.json}`.

## Residual risks

- All 4 residual risks are documented with mitigations in
  `artifacts/security/report.json` (htmx inline styles; non-signal-aware
  cancellation; single-process stores; htmx 4 provisional). None are
  unmitigated high risks.
- External penetration-test certification is out of scope by design.

## Newly unblocked

- GH-069 (M4 progressive-workflow security gate — its only dependency).
