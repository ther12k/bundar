# Security Policy

## Supported versions

Security fixes follow the event-based policy approved in GH-178 — there
are **no calendar-duration support windows**: a version is supported until
the event that supersedes it.

- **Before 1.0**: only `main` and the newest explicitly published
  prerelease receive fixes. A prerelease becomes end-of-life the moment a
  newer prerelease supersedes it in the same channel.
- **After 1.0**: the newest stable minor in the current major receives
  security and correctness fixes. A stable minor becomes end-of-life when
  the next stable minor supersedes it, unless release notes explicitly
  grant a longer window. Older majors carry no automatic support promise.

The platform/runtime scope these fixes target is the approved 1.0 support
matrix ([`docs/compatibility/support-matrix.md`](docs/compatibility/support-matrix.md)):
Bun-only (installation minimum `>=1.4.0`, release-verified reference
pinned by the battery), Linux x64 production.

## Supported release channels

| Channel | Purpose | Fixes |
| --- | --- | --- |
| `canary` | Experimental publication | Fix forward only — only the newest canary is supported |
| `alpha` | Active pre-beta validation | Fix forward only — only the newest alpha is supported |
| `beta` | External adoption and migration testing | Fix forward only — only the newest beta is supported |
| `rc` | Release-candidate freeze | Blocker fixes only — only the newest RC is supported |
| `latest` | **Stable releases only** — never a prerelease | Security and correctness patches |

Prereleases always ride non-default dist-tags; `latest` is reserved for
stable publication (ADR-0021).

## Security response targets

These are acknowledgement and assessment targets — **not a remediation
SLA**. Vulnerabilities differ too much for a fixed fix-by deadline, and no
such deadline is promised.

- **Acknowledgement target: within 7 calendar days.**
- **Initial assessment target: within 14 calendar days** of
  acknowledgement, when sufficient reproduction details exist — severity
  assigned, affected versions identified, and a fix-or-wontfix decision
  communicated.
- **Fix or disclosure deadline: none.** No fixed remediation SLA is
  offered.
- **Emergency publication** outside the normal cadence is allowed for
  confirmed high-impact issues.

## Coordinated disclosure

We follow coordinated disclosure:

- We acknowledge reports within the 7-day target above.
- We work with reporters on a fix and a reasonable embargo, coordinated
  according to severity, exploitability, and release readiness.
- Credits are given in the advisory unless anonymity is requested.
- Safe-harbor: we will not pursue action against good-faith research that
  avoids service degradation, privacy violations, and data destruction.

## Backport policy

- **Prereleases**: fix forward in the newest prerelease; no backports to
  superseded prereleases.
- **Stable 1.x**: fixes target the newest stable minor; critical security
  backports to an older minor are maintainer-discretionary, **not
  guaranteed**.
- **LTS: none.**
- **Patch releases** may contain: security fixes, correctness regressions,
  and compatibility fixes that do not intentionally break the stable API.

## Deprecation

A public stable API must be marked deprecated in documentation and
TypeScript declarations for **at least one stable minor release** before
removal, unless keeping it would preserve a confirmed security
vulnerability. Intentional breaking removals occur only in a major
release after 1.0 (approved in GH-176).

## End of life

An end-of-life version receives no guaranteed fixes but remains
installable unless removal is required for security or legal reasons; it
may still receive best-effort fixes without creating a promise. Every
release note states the channel, the version being superseded, whether
the superseded version is now end-of-life, migration notes when
applicable, and known residual risks.

## Reporting a vulnerability

**Do not open a public GitHub issue for a security vulnerability, an exploit,
a credential leak, or anything that could put users at risk before a fix
exists.**

Report vulnerabilities privately:

1. **GitHub private vulnerability reporting.** Use the *"Report a
   vulnerability"* option on the repository's *Security* tab. This is the
   preferred channel; it is private and supports advisory drafting.
2. **Direct maintainer contact.** Until the project namespace and project
   email are cleared in GH-004, reach the maintainers listed in
   `MAINTAINERS.md` through their public GitHub contact channels and request
   a private channel for details.

When GH-004 clears the public namespace, a dedicated security email address
will be added here as an additional private path.

Include what you can of: affected package and version, reproduction steps or
proof of concept, impact assessment, and any proposed remediation.

## Scope

In scope: code in `packages/`, `create-bundar/`, `scripts/`, and the CI
pipelines in `.github/workflows/`. Escaping, CSRF, cookie, upload, and
header handling in framework code are always security-relevant (see
`engineering/security-standard.md`).

Out of scope: social engineering, denial-of-service against project
infrastructure, and vulnerabilities in unreleased branches that never reach
a tag.

## Hardening baseline

Security-sensitive changes require dedicated adversarial tests in the same
change (M4 issues GH-061–GH-068) and review by a code owner of the affected
path (`.github/CODEOWNERS`).
