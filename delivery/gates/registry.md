---
type: Release Gate
title: Registry Human Approval Gate
description: Maintainer-only npm namespace, credential, and guarded-publication approval gate — packages, prerequisites, identity check, publish command, revocation, and approval record.
tags:
- release
- registry
- npm
- human-gate
status: blocked
generated:
  by: BR-079 implementation pass
  at: '2026-08-27T00:00:00+07:00'
---

# Registry human approval gate (BR-079)

**Status:** BLOCKED — maintainer action required before any publication.

**This document cannot be completed by an autonomous coding agent.** The final two steps (identity verification and publication) require direct maintainer access to npm credentials. An agent MUST NOT set `BUNDAR_RELEASE_TOKEN` to a real value, authenticate npm, or invoke the live publish command.

---

## What this gate covers

Verification that the maintainer owns or has publish access to every package name in the `@bundar` scope and to `create-bundar` on npm, followed by the guarded first publication of the `0.1.0-alpha.2` canary.

## Packages to publish (dependency-first order)

| # | Package | Scope |
|---|---------|-------|
| 1 | `@bundar/core` | npm `@bundar` |
| 2 | `@bundar/jsx` | npm `@bundar` |
| 3 | `@bundar/schema` | npm `@bundar` |
| 4 | `@bundar/forms` | npm `@bundar` |
| 5 | `@bundar/security` | npm `@bundar` |
| 6 | `@bundar/htmx` | npm `@bundar` |
| 7 | `@bundar/testing` | npm `@bundar` |
| 8 | `@bundar/cli` | npm `@bundar` |
| 9 | `create-bundar` | npm (unscoped) |

## Non-negotiable prerequisites

Before running the live publish:

1. **npm namespace**: `@bundar` scope must be owned by the maintainer's npm org. Check: `npm org ls bundar` or confirm via npmjs.com/org/bundar.
2. **Package name availability**: each of the 9 packages above must be either unclaimed or already owned by you. Check: `npm view @bundar/core` — if it returns a 404, the name is available.
3. **Authentication**: log in with `npm login` (or `npm login --auth-type=web`). Confirm with `npm whoami`; it must return your username.
4. **2FA policy**: the `@bundar` org should have publish-time OTP or trusted publishing (npm Attestations / GitHub Actions OIDC) enforced. Do not configure write-capable tokens without 2FA.
5. **Approval token**: set `BUNDAR_RELEASE_TOKEN` to any non-empty secret value in your terminal session. **Do not commit this value.** It is a session-scoped sentinel; the publish script checks for its presence.
6. **Candidate manifest**: run `bun run publish:dry-run` on a clean, committed working tree to regenerate `artifacts/release/candidate-manifest.json` bound to the exact release SHA. Verify: `bun run release:verify` must pass all checks including cross-artifact set equality.
7. **Dry-run confirmed**: `bun run publish:approved -- --dry-run` must print the 9-package plan and exit 0 without touching the registry.

## Read-only identity check (agent-safe)

```bash
# Verify npm auth (does NOT publish anything)
npm whoami

# Verify @bundar scope ownership
npm org ls bundar 2>/dev/null || echo "Not an org member"

# Verify each name is claimable or already owned
for pkg in @bundar/core @bundar/jsx @bundar/schema @bundar/forms \
           @bundar/security @bundar/htmx @bundar/testing @bundar/cli \
           create-bundar; do
  echo -n "$pkg: "
  npm view "$pkg" version 2>/dev/null || echo "404 (available)"
done

# Verify candidate manifest is bound to a clean commit
bun run release:verify
```

## Guarded publish command (maintainer only)

```bash
# STEP 1 — set the approval sentinel in your terminal (do not commit)
export BUNDAR_RELEASE_TOKEN="your-session-approval-sentinel"

# STEP 2 — confirm npm identity
npm whoami

# STEP 3 — dry-run (must pass; does NOT publish)
bun run publish:approved -- --dry-run

# STEP 4 — live publish (only after steps 1-3 are confirmed)
bun run publish:approved -- --tag canary

# STEP 5 — verify registry with byte-for-byte download proof
bun run registry:verify -- --tag canary --download

# STEP 6 — unset the sentinel
unset BUNDAR_RELEASE_TOKEN
```

The publisher refuses to run without both `BUNDAR_RELEASE_TOKEN` and a successful `npm whoami`. `--dry-run` is always safe and can never call `npm publish` (proven by fake-npm tests in `tests/release/publisher-safety.test.ts`).

## Emergency revocation

```bash
# Deprecate a bad release (does NOT unpublish — npm policy)
npm deprecate @bundar/core@0.1.0-alpha.2 "DO NOT USE — revoked; see advisory #NNN"
# Repeat for each affected package in reverse publish order.
# Then publish a fixed pre-release on the same dist-tag.
```

## Who must act

| Role | Required action |
|------|----------------|
| **npm account owner** | `npm login`, `npm whoami`, scope ownership check |
| **Human maintainer** | Set `BUNDAR_RELEASE_TOKEN` in terminal; run the publish command; record approval identity below |
| **Autonomous agent** | BLOCKED — must not supply credentials, authenticate npm, or invoke the live publish step |

## Approval record (to be filled by the maintainer)

```
Maintainer npm username  : __________________________
GitHub identity          : __________________________
Date / time (ISO-8601)   : __________________________
Publish commit SHA       : __________________________
Confirmed dist-tag       : canary
Post-publish registry:verify: PASS / FAIL
```

---

*This file is agent-written and review-ready. The approval record above cannot be filled by automation.*
