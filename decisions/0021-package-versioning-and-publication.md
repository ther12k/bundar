---
type: Architecture Decision
title: ADR-0021 — Package Versioning and Publication Policy (Pre-1.0)
description: Synchronized lockstep versions for all public packages, alpha/beta/latest/next dist-tag rules, internal dependency ranges, GitHub-release-to-registry correspondence, yank/rollback policy, and human approval boundaries for npm publication.
tags:
- adr
- architecture-decision
- release
- versioning
- publication
status: accepted
updated: '2026-08-25'
decision:
  id: ADR-0021
  state: accepted
---

# Status

**Accepted** — M8.6 distribution readiness (BR-078). Supersedes nothing;
extends `engineering/versioning.md` with the registry-publication half that
was previously improvised.

# Context

The GitHub alpha `v0.1.0-alpha.1` exists while every workspace package is
still `private: true` at `0.0.0` with `workspace:*` internal dependencies.
BR-079 (namespace/credentials) and BR-081 (canary) will open the registry
door; without a frozen policy, each publication decision would be improvised
package by package — exactly what the post-alpha review flagged.

The package topology is a strict DAG (leafs: `core`, `jsx`, `schema`,
`create-bundar`; mid: `forms` → core+schema, `security` → core,
`htmx` → forms+jsx; consumers: `cli`, `testing`). Every internal edge moves
with the framework contract: routing, form, and dialect APIs co-evolve.

# Decision

## 1. Synchronized lockstep versions — all public packages, one version

Every publishable package carries the SAME version on every release:

| Package | Role | First published version | First dist-tag |
| --- | --- | --- | --- |
| `@bundar/core` | HTTP kernel | `0.1.0-alpha.2` | `alpha` |
| `@bundar/jsx` | server JSX runtime | `0.1.0-alpha.2` | `alpha` |
| `@bundar/schema` | Standard Schema adapters | `0.1.0-alpha.2` | `alpha` |
| `@bundar/forms` | progressive form actions | `0.1.0-alpha.2` | `alpha` |
| `@bundar/security` | sessions/CSRF/headers | `0.1.0-alpha.2` | `alpha` |
| `@bundar/htmx` | dialect adapters | `0.1.0-alpha.2` | `alpha` |
| `@bundar/cli` | dev/route tooling | `0.1.0-alpha.2` | `alpha` |
| `@bundar/testing` | test clients | `0.1.0-alpha.2` | `alpha` |
| `create-bundar` | scaffolder | `0.1.0-alpha.2` | `alpha` |

`0.1.0-alpha.2` continues the line opened by the source-only GitHub release
`v0.1.0-alpha.1` — the registry did not receive `alpha.1`, so `alpha.2` is
the first REGISTRY version, not a new line.

Rationale for lockstep over independent versions pre-1.0:

- Internal ranges stay a single expression (`^0.1.0-alpha.2`); independent
  versions would need per-edge ranges that drift the moment one package
  hotfixes alone.
- Cross-package contracts (core context ↔ htmx views ↔ forms actions) have
  no independently versionable surface yet; "partial upgrades" are untested
  combinations we would be implicitly claiming to support.
- One rollback story: consumers pin one version.

`create-bundar` has no internal dependencies and MAY fork to independent
versioning later — but only by superseding ADR, never in passing.

**In-repo manifests stay `0.0.0` + `private: true` until the publication
commit.** The publication pipeline (BR-081) sets `version` AND flips
`private: false` together, on the release tag, for all nine packages at
once — never one package at a time, never a version bump without the flip.
This keeps the README "not yet published" fact and `docs:status-check`
honest until publication actually happens.

## 2. Dist-tag rules

| Tag | Meaning | Rule |
| --- | --- | --- |
| `alpha` | prerelease of `0.1.0`, canary quality | Only tag used while `0.1.0-alpha.N` publishes; every canary bumps `N` |
| `beta` | prerelease of `0.1.0`, beta-gated | Replaces `alpha` as the moving tag once BR-085 passes; `alpha` then stays on the last alpha |
| `latest` | **EMPTY until stable `0.1.0`** | No prerelease ever claims `latest`. `npm install @bundar/core` before GA resolves to NOTHING |
| `next` | **EMPTY and reserved** | Not an experimental-htmx channel, not a moving target; only used if a FUTURE stable line needs a prerelease channel, by ADR |

Empty-until-stable `latest` is the load-bearing rule: it makes "pre-1.0,
pin exact versions" mechanically true instead of aspirational.

## 3. The experimental htmx 4 adapter can never imply GA

- `@bundar/htmx/4` is documented EXPERIMENTAL; `HTMX4_TESTED_VERSION` is a
  beta pin (`4.0.0-beta6`) and MUST remain a prerelease string for as long
  as M7 is open.
- `tools/release/plan.ts` fails if the v4 pin loses its prerelease
  hyphen while the M7 descope record still stands — a GA-looking pin with
  a not-planned GA chain is a contradiction, and the tool makes it loud.
- The 2.x dialect remains the default in every template, scaffold, and
  doc; a default flip happens only through the M7 chain (GH-089–GH-096).
- `release:notes-check` already forbids beta-as-stable phrasing; it stays
  mandatory for every registry release.

## 4. Internal dependency ranges at publication

- In-repo: `workspace:*` only. Any other specifier on an internal edge is
  a policy violation (`release:plan` fails).
- Published manifests: `bun pm pack` rewrites (`workspace:*` → bare
  `0.0.0`) are repaired by the existing two-pass pipeline to
  **`^0.1.0-alpha.2`-style caret ranges of the synchronized line**. Caret
  on a prerelease admits same-tuple later prereleases and the `0.1.0`
  final — exactly the lockstep upgrades we intend to allow.
- No shipped manifest may contain `workspace:` or a bare `0.0.0` internal
  spec; `pack:audit` already fails on both and stays mandatory.
- Peer/optional dependencies: NONE today. htmx dialect pins are vendored
  inside `@bundar/htmx` on purpose — consumers never install `htmx.org`
  themselves, so adapter pins cannot be shadowed. Adding any peer
  dependency requires a superseding ADR.
- External runtime dependencies: `@bundar/core` and `@bundar/jsx` remain
  ZERO-runtime-dependency (frozen boundary); no public package may add a
  runtime dependency without the dependency-policy gate.

## 5. GitHub source releases ↔ registry packages

- Every registry publication happens from an immutable git tag
  `v<version>` created BEFORE `npm publish`; the tag's commit SHA binds the
  SBOM, provenance, and checksums artifacts.
- A GitHub release without registry publication (like `v0.1.0-alpha.1`)
  is a **source-only release** and remains valid; release notes must say
  which kind they are.
- GitHub Release bodies link the registry version, the gate record, and
  the artifacts; they never restate compatibility claims the gates did not
  make.

## 6. Deprecation, yank, rollback (pre-1.0)

- Pre-1.0 there is NO deprecation-window promise; breaking changes
  require migration notes and a scaffolder/template update in the same
  release.
- **Yank** only for security/legal defects. A yank is followed by the next
  patch on the same line as soon as the fix is gated — consumers must
  never be stranded.
- **Rollback** = exact-pin the previous synchronized version; because all
  packages move together, one pin rolls back the framework.

## 7. Human approval boundaries and automation behavior

- Registry publication runs ONLY through `publish:approved`, which refuses
  to touch the network without `BUNDAR_RELEASE_TOKEN` + npm identity
  (existing behavior, stays frozen).
- CI and any noninteractive automation NEVER publish and NEVER move
  dist-tags — `latest`/`next` assignments are human actions recorded in
  the release notes.
- `release:plan` is the noninteractive preflight: it validates this ADR's
  invariants against the working tree and prints the intended plan
  (human/JSON) without side effects.

# Enforcement (machine-checked, not aspirational)

`bun run release:plan [--json]` fails on ANY of:

1. A version that is not exactly `0.0.0` in any in-repo manifest (no
   partial bumps, no premature publication posture).
2. A `private` flag that is not `true` in any in-repo manifest.
3. An internal dependency edge using anything but `workspace:*`.
4. An unknown internal dependency (name not in the package set).
5. An external runtime dependency in `@bundar/core` or `@bundar/jsx`.
6. `HTMX4_TESTED_VERSION` losing its prerelease hyphen while
   `delivery/descopes/m7-htmx4-ga.md` stands (GA-looking pin, GA chain
   not planned — contradiction).

`bun run package:audit` (alias of the existing `pack:audit`) additionally
fails on shipped manifests containing `workspace:`/bare-`0.0.0` specs,
missing licenses, or extra files.

# Consequences

- BR-079 (namespace/credentials) and BR-080 (tarball re-audit) inherit a
  fixed target: one synchronized version, one flip commit, caret ranges.
- BR-081's canary = `0.1.0-alpha.2` on dist-tag `alpha`, `latest` empty.
- The beta gate (BR-085) can require `release:plan` green as a
  precondition — cheap, fast, and impossible to argue with.
- Cost: a one-line framework fix still bumps nine packages. Pre-1.0 that
  is the correct cost — we ship tested combinations, not mixtures.
