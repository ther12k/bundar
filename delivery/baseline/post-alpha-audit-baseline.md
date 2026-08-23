---
type: Audit Baseline Record
title: Post-Alpha Review Baseline and Provenance (BR-001)
description: Immutable anchor for the post-alpha review findings — repository revision, environment pins, bundle provenance, source ledger, and finding classifications after rebasing to the implementation HEAD.
tags:
- m8
- baseline
- audit
- evidence
status: final
updated: '2026-08-23'
---

# Post-alpha audit baseline and provenance (BR-001)

## Baseline identity

| Field | Value |
| --- | --- |
| Repository | `https://github.com/ther12k/bundar` |
| Audited revision (review baseline) | `f8bdd8641865be3563746e892ab86fba702ee3e8` (`f8bdd86`) |
| Review executed | 2026-08-22/23, UTC+7 |
| Alpha tag in force | [`v0.1.0-alpha.1`](https://github.com/ther12k/bundar/releases/tag/v0.1.0-alpha.1) (GitHub pre-release, published 2026-08-22) |
| Bun baseline | `1.4.0` (`packageManager: bun@1.4.0`, engines `>=1.4.0`; local verification ran Bun `1.4.0`) |
| Stable htmx pin | `2.0.10` (default dialect) |
| Experimental htmx pin | `4.0.0-beta6` (selectable, never default) |

## Review-bundle provenance

The review artifact is `bundar-post-alpha-review-beta-plan-v0.1.zip`.

| Check | Result |
| --- | --- |
| Archive SHA-256 | `c44f0adf861b1769352490f8b6c9718f805ebd42cc53444be1033b49b773f83e` — matches the value supplied with the bundle |
| Internal manifest (`SHA256SUMS.md`) | All **122** listed files re-hashed byte-for-byte; zero mismatches |
| Bundle audit baseline field | `commit: f8bdd86…` — identical to the revision above |
| Contents | 123 markdown documents, 85 microtasks, 7 milestones, 189 dependency edges, 15 execution waves, 784 validated internal links |

## Rebase of the audit baseline

The only repository change between the audited revision and this record's
reference HEAD `29bf969aea3b28776a777495edf61b487b0a377e` at writing time is
documentation plus the M8.0 correctness work itself; no framework source
changed between `f8bdd86` and `8ffd270`, so every source-level finding
carries over unchanged.

```text
git diff --stat f8bdd86..8ffd270
 README.md | 390 ++++++++++++++++++++++++++++++++++++++++++++++++++------------
```

## Verification status separation

Freshly executed on this workstation (Bun 1.4.0, Linux):

- Zip + internal-manifest integrity (results above)
- `git rev-parse` / `git diff --stat` rebase delta
- BR-002 probe: per-request composition reproduced (25 compositions / 5 requests), then BR-003 fix verified (probe green)
- BR-005 probes: global-symbol forgery and prototype laundering reproduced, then BR-006 fix verified (probes fail closed)
- Focused suites: `packages/core/test` 182/182, `packages/jsx/test` 156/156
- `bun run lint`, `bun run typecheck`, `bunx prettier --check README.md`, `bun run docs:check`, `bun run security:raw-html-audit`

Trusted from committed release evidence (not re-executed here):

- The full `bun run ci:release` battery behind the [alpha gate](../gates/alpha.md)
- Browser conformance lanes (Chrome for Testing), SBOM/provenance/reproducibility records
- npm registry dist-tag facts quoted by the [M7 descope record](../descopes/m7-htmx4-ga.md)

No claim anywhere in this record or its sources asserts that an official
htmx 4 GA release exists; the v4 line remains beta upstream and M7 stays
externally blocked.

## Source ledger (claim → evidence)

| Claim | Source |
| --- | --- |
| Middleware composed per request despite GH-018 contract | `packages/core/src/routing/compiler.ts` (request-closure `composeMiddleware` call at the audited revision); reproduction: `packages/core/test/middleware/composition-count.test.ts` |
| Raw-HTML brand forgeable via global symbol registry | `packages/jsx/src/raw.ts` (`Symbol.for("bundar.jsx.raw")`); reproduction: `packages/jsx/test/security/raw-html-forgery.test.ts` |
| Root README presented Bundar as a design archive | Git history: `9ffe003 docs: replace design-bundle README with the implementation README` (merged as `135c06f`) |
| htmx 2.0.10 stable / 4.0.0-beta6 experimental pins | `packages/htmx/src/assets.ts`, `packages/htmx/src/dialects/v2/index.ts`, `packages/htmx/src/dialects/v4/index.ts` |
| Alpha gate evidence (trusted, committed) | [delivery/gates/alpha.md](../gates/alpha.md) |
| Release/publication posture (registry pending) | [docs/release-notes/alpha.md](../../docs/release-notes/alpha.md) |
| Review verdict summary (~71% planning indicator, binary GO/NO-GO gate) | Bundle `review/EXECUTIVE_REVIEW.md`, `review/SCORECARD.md` (inside the checksum-verified zip) |

## Finding classification after rebase (M8.0 slice)

| ID | Finding | Classification | Status at `29bf969` |
| --- | --- | --- | --- |
| BR-002 | Middleware composition count | Contract mismatch (reproduced) | Closed by BR-003 fix |
| BR-003 | Compose once at compile phase | Confirmed defect (reproduced) | Fixed in `3d540f5`; core suite green |
| BR-005 | Raw-HTML brand forgery | Contract mismatch (reproduced); not a proven remote vulnerability | Closed by BR-006 fix |
| BR-006 | Opaque raw trust marker | Confirmed defect (reproduced) | Fixed in `29bf969`; jsx suite green |
| BR-008 | Stale design-bundle root README | Documentation drift | Resolved before this record (`135c06f`) |
| BR-004 | Middleware hot-path budget | Enhancement (benchmark guard) | Open |
| BR-007 | Renderer header / unsafe-sink audit | Probable-defect sweep requiring reproduction | Open |
| BR-009+ | Docs/tooling/boundary tasks | Enhancements and human gates | Open, tracked in the bundle issue manifest |
