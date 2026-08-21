# GH-010 Verification Transcript

## Gate context

- Stable ID: GH-010
- Gate branch: `gh-010-m0-gate`
- Pre-gate `main` commit: `a7f14011cd89af2ee663f4c0a9acdcd947dd3659`
- Authorized implementation SHA: `fe6139e409d62833a816117cee9cc482cec6a762`
- Closure metadata commit: `781ac82`
- Main merge SHA: recorded in the final closure update after merge
- Runtime: Bun `1.4.0`
- TypeScript: `6.0.3`
- ESLint: `10.8.1`
- Prettier: `3.9.6`
- Hono reference: `4.13.3`
- Browser: Chrome for Testing `152.0.7977.8`, Playwright Chromium `1237`
- Operating system: Linux x86_64, Ubuntu kernel `7.0.0-28-generic`

## Commands and results

The canonical command is `bun run ci:m0`. It runs 17 ordered steps and stops on
the first nonzero child status. The initial gate run and the final committed-state run both passed all steps. The final output is retained in `evidence/gh-010/ci-m0-final-output.txt`:

```text
$ bun install --frozen-lockfile
bundar preflight: ok (bun 1.4.0, minimum 1.4.0)
Done! Checked 107 packages (no changes)
  -> exit 0

$ bun run ci:m0
[m0] all 17 required steps passed
  -> exit 0

$ bun run docs:validate
ok (207 documents, 96 issues, local structural validation only)
  -> exit 0

$ bun run architecture:check
architecture:check: ok (7 source files, 7 package rules enforced)
  -> exit 0
```

The 17-step aggregate includes `preflight`, `format:check`, `lint`,
`typecheck`, `docs:validate`, `docs:links`, `issues:graph`, `docs:check`,
`bun test tests/architecture`, `architecture:check`, `bench:smoke`,
`bench:parity`, both browser lanes, the browser report, full `bun test`, and
`build`. Full command output is retained in the local gate-run artifacts
`evidence/gh-010/install-output.txt`, `evidence/gh-010/ci-m0-output.txt`, and
`evidence/gh-010/ci-m0-final-output.txt`; this transcript is the durable summary.

## Dependency evidence

- GH-004: brand/namespace decision is accepted for private implementation only;
  identifiers remain temporary and unreserved. Official trademark screening,
  counsel review, social handles, registrar proof, and publication reservation
  remain future work.
- GH-005: package boundaries, zero-runtime-dependency policy, server-only JSX
  boundary, handler principles, and HTMX adapter boundary are frozen. Exact
  signatures remain deferred.
- GH-006: `bun test tests/architecture` reports 13 pass/0 fail and
  `architecture:check` reports 7 source files and 7 rules; transcript:
  `evidence/gh-006/verification-transcript.md`.
- GH-007: 9 benchmark smoke/parity scenarios pass. The harness is raw Bun/Hono,
  in-process, and makes no Bundar performance claim; transcript:
  `evidence/gh-007/verification-transcript.md`.
- GH-008: both browser lanes pass with exact pinned assets and captured headers;
  the deliberate missing-header assertion fails inside each lane as expected.
  htmx 2 is stable; htmx `4.0.0-beta6` is experimental and not GA evidence.
- GH-009: project configuration and governance artifacts are merged; its live
  project status was audited separately from the historical setup transcript.

## Accepted deviations

- `status: draft` in OKF frontmatter is corpus review metadata, not GitHub issue
  or project completion status.
- The browser-dependent M0 gate is not wired into ordinary GitHub CI because the
  Playwright CLI/browser asset is not a reproducible repository dependency yet.
  Local gate execution is mandatory and fail-closed.
- No production HTTP, JSX, HTMX, security, compatibility, performance, or
  publication claim is authorized by M0. M1–M3 implementation proceeds only
  within the frozen principles and recorded residual risks.

## Residual risks

- GH-004 publication and legal clearance remain blocked until the later release
  reservation/trademark gate.
- GH-005/GH-006 boundary enforcement is source-text/import-graph based and has
  no hosted cross-platform result in this local gate.
- GH-007 lacks network, startup, slow-client, Bundar, and reviewed regression
  threshold evidence.
- GH-008 htmx 4 lifecycle behavior differs from htmx 2; streaming/partial
  transport and Bundar runtime conformance remain future M3 work.

## Evidence locations

- `delivery/gates/m0.md`
- `evidence/gh-004/verification-transcript.md`
- `evidence/gh-005/verification-transcript.md`
- `evidence/gh-006/verification-transcript.md`
- `evidence/gh-007/verification-transcript.md`
- `evidence/gh-008/report.json`
- `evidence/gh-008/verification-transcript.md`
- `evidence/gh-009/verification-transcript.md`
- `evidence/gh-010/verification-transcript.md`
