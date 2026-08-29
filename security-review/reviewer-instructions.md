# Reviewer instructions

## 0. Independence requirement (the point of GH-177)

The reviewer must not have authored, co-authored, or directed the code
under review. For this repository that means, concretely:

- The implementation agents and AI assistants that wrote, audited, or
  directed these subsystems **do not qualify** as the independent
  reviewer. Their prior self-audits (the `tools/security/` audits, the
  drift tests, the posture suites) are INPUTS to this review, not
  substitutes for it.
- The reviewer records a short independence statement (who they are,
  which subsystems — if any — they touched before) at the top of
  `security-review/findings.md`.

If you (the reviewer) find you cannot make that statement for an area,
say so in the findings header and review that area anyway with the
limitation noted — the value of GH-177 is a fresh judgment, and a
disclosed partial independence beats a skipped area.

## 1. Environment

```bash
bun install --frozen-lockfile
bun test                # full suite (must be green before you start)
bun run test:security   # the nine fail-closed audits
bun run security:report # generated posture report
bun run architecture:check
```

- Runtime: Bun >= 1.4.0 (the declared minimum; the release-verified
  reference is the battery-pinned version — see
  `docs/compatibility/support-matrix.md`).
- Never run `bun run publish:approved` WITHOUT `--dry-run`; the only
  permitted publication-adjacent command in this review is
  `bun run publish:approved -- --dry-run` and `registry:verify
  --preflight`. Nothing in this review should touch npm.
- Do not disable, weaken, or convert any gate/test to a warning to make
  a finding disappear. If a gate looks wrong, that is a finding.

## 2. Method

Suggested order per area (scope.md lists the areas; architecture-map.md
gives the files; trust-boundaries.md frames each boundary):

1. Read the documented guarantee (`docs/guides/security.md`,
   `sessions.md`, `uploads.md`, `docs/security/*.md`).
2. Read the audit tool that enforces it (`tools/security/`).
3. Read the tests that pin it (test-inventory.md).
4. Read the implementation with the boundary's review questions in mind.
5. Try to break it concretely: build a minimal app with
   `@bundar/testing`'s client (origin headers, cookie jars, enhanced and
   no-JS lanes) and reproduce the attack you have in mind. A finding
   without a reproduction or a concrete code-trace argument is a note,
   not a finding.

Cross-cutting questions worth answering everywhere:

- Docs-vs-code drift (the docs make claims; do they still hold?).
- Fail-closed auditability: does the framework prefer failing closed,
  and is the failure observable?
- Asymmetry: a guarantee with an audit but no test, or a test with no
  audit, is a finding candidate.
- The duplicates story everywhere: duplicate headers, duplicate cookies,
  duplicate form fields, duplicate route registrations.
- Cancellation everywhere: what state survives an aborted request
  (sessions, transactions, temp files, streamed responses)?

## 3. Findings routing (from GH-177)

- **Exploitable** → PRIVATE disclosure per `SECURITY.md` (the private
  reporting channel there). Do NOT open a public issue, do NOT put
  exploit details in this repository. Record a placeholder entry in
  `findings.md` marked "reported privately" with the date.
- **Hardening** → normal GitHub issues (public, reference the finding
  ID).
- **Documentation gaps** → docs fixes (a PR or an issue, reviewer's
  choice).

Severity classes P0–P3 are defined in `scope.md`.

## 4. Deliverable

- `security-review/findings.md` — one entry per finding using
  `finding-template.md`, preceded by the independence statement, the
  commit SHA reviewed (`git rev-parse HEAD`), and a coverage summary:
  which areas were reviewed, how long, and what was deliberately
  shallow.
- Findings with dispositions are referenced from the GH-177 thread and
  `log.md` as the M9 gate evidence.

## 5. Ground rules for the review record

- Report faithfully: state reproductions that failed as well as those
  that worked. A clean bill for an area needs the attempted attacks
  listed, not just "no findings".
- No time pressure is implied by the packet; a shallow review marked as
  shallow is more valuable than a deep review marked as complete.
- This packet's own documents are reviewable: if the map, boundaries,
  or residual-risk list is wrong, correcting them is a P2-or-better
  docs finding.
