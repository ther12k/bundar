# Security Policy

## Supported versions

Bundar is pre-alpha. Only the current `main` branch receives security fixes;
there are no stable releases, backports, or long-term support promises yet
(see `SUPPORT.md`). Supported-release expectations will be published here
when the first alpha ships (GH-088).

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

## Coordinated disclosure

We follow coordinated disclosure:

- We acknowledge reports within 7 days.
- We work with reporters on a fix and a reasonable embargo.
- Credits are given in the advisory unless anonymity is requested.
- Safe-harbor: we will not pursue action against good-faith research that
  avoids service degradation, privacy violations, and data destruction.

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
