# Support Policy

## Project status

Bundar is pre-1.0 alpha software under active development. Published
candidates ride non-default dist-tags (`canary` / `alpha` — never `latest`
before 1.0, per ADR-0021). APIs may still change without deprecation shims
until the public API contract is frozen for 1.0 (milestone M9;
`project/open-source-strategy.md`, Stability promise).

## Supported versions

The event-based policy approved in GH-178 — support ends when the
superseding event happens, never on a calendar clock:

- **Before 1.0**: `main` and the newest explicitly published prerelease.
  A prerelease is end-of-life when a newer prerelease supersedes it in
  the same channel.
- **After 1.0**: the newest stable minor in the current major. A stable
  minor is end-of-life when the next stable minor supersedes it, unless
  release notes explicitly grant a longer window. Older majors carry no
  automatic support promise.
- **No LTS commitment. No guaranteed backport to superseded minors.**

## Release channels

| Channel | Purpose | Fixes |
| --- | --- | --- |
| `canary` | Experimental publication | Newest canary only; fix forward |
| `alpha` | Active pre-beta validation | Newest alpha only; fix forward |
| `beta` | External adoption and migration testing | Newest beta only; fix forward |
| `rc` | Release-candidate freeze | Newest RC only; blocker fixes only |
| `latest` | **Stable releases only** — never a prerelease | Security and correctness patches |

## What is supported

- **Scope:** the approved 1.0 support matrix
  ([`docs/compatibility/support-matrix.md`](docs/compatibility/support-matrix.md)):
  Bun-only (installation minimum `>=1.4.0`; release-verified reference
  disclosed separately), Linux x64 production. macOS may work for local
  development but is not part of the verified production support matrix;
  Windows and arm64 are not claimed. Browser conformance covers the
  Chromium revision supplied by the pinned Playwright toolchain.
- **Bugs and regressions:** open a GitHub issue with reproduction steps,
  environment versions, and evidence. Security vulnerabilities are the
  exception — report them privately per [`SECURITY.md`](SECURITY.md).
- **Questions and usage help:** open a GitHub discussion once discussions are
  enabled (GH-009); until then, issues are acceptable.
- **Feature proposals:** open an issue referencing the relevant roadmap area
  in [`delivery/roadmap.md`](delivery/roadmap.md).

## How to get help

| Need | Channel |
| --- | --- |
| Security vulnerability or confirmed credential leak | GitHub Private Vulnerability Reporting (see [`SECURITY.md`](SECURITY.md)) |
| Bugs and regressions | GitHub Issues, with reproduction |
| Usage questions | GitHub Discussions once enabled; Issues accepted until then |
| Feature proposals | GitHub Issues tied to a roadmap area |
| Private or commercial support | **Not offered or promised** |

Public bugs and questions carry **no response SLA**; security reports
carry the acknowledgement and assessment targets in [`SECURITY.md`](SECURITY.md)
only.

## Backports

- Prereleases: fix forward in the newest prerelease; no backports to
  superseded prereleases.
- Stable 1.x: fixes target the newest stable minor; critical security
  backports to an older minor are maintainer-discretionary, **not
  guaranteed**.
- **LTS: none.**

## Deprecation

A public stable API is marked deprecated in documentation and TypeScript
declarations for at least one stable minor release before removal;
intentional breaking removals occur only in a major release after 1.0
(security exception permitted).

## What is not supported

- No LTS, no backport window, and no security-response or support SLA
  exists beyond the targets stated in [`SECURITY.md`](SECURITY.md); any
  wider commitment will be published only when maintainers approve it.
- Unmodified forks, example applications deployed to production, and
  third-party extensions are supported by their respective maintainers.
- Versions of Bun below the minimum pinned in the root `package.json`
  (`engines.bun`) are unsupported; the preflight script fails closed on them.

## Compatibility support

Runtime and dialect compatibility is governed by the approved 1.0 support
matrix ([`docs/compatibility/support-matrix.md`](docs/compatibility/support-matrix.md)).
Compatibility claims require recorded conformance evidence, not assertions.
