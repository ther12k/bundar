---
type: Operations Guide
title: Publishing Guide for Maintainers
description: End-to-end npm publication procedure — authentication, candidate preparation, dry-run verification, dependency-first publish order, dist-tag policy, rollback, and credential hygiene.
tags:
- release
- publishing
- npm
- maintainers
status: draft
generated:
  by: BR-079 implementation pass
  at: '2026-08-27T00:00:00+07:00'
---

# Publishing guide for maintainers

This guide documents the complete publication procedure for Bundar packages.
No credential value should ever be committed, printed, or included in any artifact.

## Package scope

All Bundar packages are published under the `@bundar` npm scope, except the
scaffolding tool which is published as the unscoped `create-bundar`. The scope
must be owned by the maintainer's npm organization before any publication.

## Prerequisites

### npm identity

```bash
npm login            # authenticate (web or classic OTP)
npm whoami           # must return your username before proceeding
```

Use npm's trusted publishing (OIDC-based, no stored token) where possible.
If using an automation token, it must be a **publish-scoped granular token**
restricted to the `@bundar` scope and `create-bundar`, valid for ≤ 7 days,
with 2FA required on the account.

### The authoritative candidate (Model B)

The **successful public Candidate Release Battery bundle is the single
authoritative candidate**. Nothing is rebuilt at publish time; the
human-gated workflow downloads and publishes the exact bytes the public
battery validated.

1. Trigger **Candidate Release Battery** (workflow_dispatch) on the merged
   main commit. It runs the 28-step `ci:release`, then writes
   `artifacts/release/candidate-identity.json` pinning the workflow SHA,
   candidate source SHA, manifest SHA-256, artifact name, and all nine
   tarball SHA-256 digests, uploads them as the immutable artifact
   `release-candidate-artifacts-<sha>`, and records the GitHub artifact
   digest in the run summary.
2. Copy the run ID and artifact digest from the successful run.
3. Trigger **Release (human-gated)** with:
   - `tag` — dist-tag (`canary`; never `latest`)
   - `version` — exact candidate version
   - `battery_run_id` — the successful battery run whose bundle is the
     candidate (required)
   - `expected_artifact_digest` — the `sha256:…` digest recorded by the
     battery (recommended; the job aborts on mismatch)
   - `dry_run_only` — verify the bundle without publishing

Both jobs download the named artifact from that run, verify the digest and
`candidate-identity.json` (workflow SHA = battery head SHA, artifact name,
dist-tag, 9 packages), then run `publish:approved` with
`--manifest <bundle>/artifacts/release/candidate-manifest.json
--tarball-root <bundle>` so only the downloaded bytes are ever published.

## Candidate preparation (local inspection)

The candidate pipeline runs once on a clean, committed working tree:

```bash
# Regenerate the candidate from the release SHA
git checkout <release-sha>
git status   # must show a clean source tree

# Build publication-form tarballs and write candidate-manifest.json
bun run publish:dry-run

# Cross-artifact verification (5-set hash equality must pass)
bun run release:verify
```

The candidate manifest (`artifacts/release/candidate-manifest.json`) records:
- Exact source SHA (40 hex characters)
- 9 package names, versions, relative tarball paths, SHA-256 digests
- dist-tag (`canary` for pre-releases)

## Dry-run verification (always safe, always first)

```bash
# Set the approval sentinel in your terminal — NEVER commit this value
export BUNDAR_RELEASE_TOKEN="your-session-sentinel"

# Dry-run: verifies all 9 candidate tarballs on disk, prints the plan, exits 0
bun run publish:approved -- --dry-run
```

The `--dry-run` flag is parsed before any credential check and is proven by
automated tests to be incapable of reaching `npm publish`. Running it with the
above sentinel set and `npm whoami` succeeding is the final safety check before
publication.

## Live publication

```bash
# Only after dry-run passes cleanly:
bun run publish:approved -- --tag canary

# Post-publication registry verification with required byte-for-byte proof
bun run registry:verify -- --tag canary --download

# Unset the sentinel
unset BUNDAR_RELEASE_TOKEN
```

The publisher enforces in order:
1. `--dry-run` (if present) → always exits before publish regardless of credentials.
2. `BUNDAR_RELEASE_TOKEN` must be set.
3. `npm whoami` must succeed.
4. The shared strict manifest loader must accept the candidate: exact
   portable schema, exact 9-package release set, contained repo-relative
   paths, on-disk SHA-256 equality, and packed tarball identity (exact
   name/version, not private, lockstep internal ranges).
5. `npm publish <file.tgz> --tag canary --access public` for each package in dependency-first order.

## Publish order

Packages are always published in dependency-first order to avoid broken lockstep references in the registry window:

1. `@bundar/core`
2. `@bundar/jsx`
3. `@bundar/schema`
4. `@bundar/forms`
5. `@bundar/security`
6. `@bundar/htmx`
7. `@bundar/testing`
8. `@bundar/cli`
9. `create-bundar`

## dist-tag policy (ADR-0021)

| Tag | Meaning | Used for |
|-----|---------|---------|
| `canary` | Latest pre-release | All `0.x.y-alpha.*` and `0.x.y-beta.*` releases |
| `latest` | Stable release | ≥ 1.0.0 only, requires `--allow-latest-tag` override |
| `next` | Optional next-beta | Future use |

Publishing with `--tag latest` is blocked by the publisher unless `--allow-latest-tag` is additionally passed.

## Rollback / deprecation

npm does not allow unpublishing packages published more than 72 hours ago. For a
bad release:

```bash
# Deprecate (does not remove from registry)
npm deprecate @bundar/core@<bad-version> "DO NOT USE — see advisory GHSA-XXXX"
# Repeat for each affected package

# Publish a fixed version on the same dist-tag
bun run publish:approved -- --tag canary
```

## Credential hygiene

- Never share npm automation tokens via issue comments, PR descriptions, or agent prompts.
- Rotate tokens immediately after any accidental exposure.
- The `BUNDAR_RELEASE_TOKEN` env var is a session sentinel only — it is not the npm token itself.
- Actual npm credentials travel only through `npm login` / OIDC trusted publishing.

## GitHub Actions trusted publishing (future)

See `.github/workflows/release.yml` for the proposed OIDC-based workflow
that eliminates stored npm tokens by using GitHub Actions as a trusted publisher.
Enable this once the `@bundar` scope supports npm Attestations.
