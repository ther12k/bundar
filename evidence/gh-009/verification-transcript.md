# GH-009 Verification Transcript

## Environment

- Repository: `ther12k/bundar`
- GitHub CLI authenticated as `ther12k`
- Bun 1.4.0 for local validators
- Recorded 2026-08-21

## Local configuration

```text
$ bun run docs:validate
docs:validate: ok (207 documents, 96 issues, local structural validation only — it is not certification by Google or any third party)
  -> exit 0

$ bun run docs:check
docs:check: ok (7 governance files, 11 manifests verified)
  -> exit 0

$ python template/config syntax checks
template/config syntax checks: OK
  -> exit 0
```

Added and validated:

- `.github/ISSUE_TEMPLATE/implementation.yml` — stable ID, scope,
  dependencies, acceptance, verification/evidence, and governance checks.
- `.github/ISSUE_TEMPLATE/config.yml` — blank issues disabled; private GitHub
  vulnerability reporting contact link.
- `.github/pull_request_template.md` — one-issue scope, contract impact,
  exact verification, evidence, HTMX/no-JS/security/performance checklist.
- `.github/project-fields.json` — reviewable field/view source.
- `.github/project-automation.yml` — conservative automation policy.
- `github/configuration-manifest.json` — live repository/project mapping.

## Live GitHub configuration

```text
Repository: https://github.com/ther12k/bundar
Project: https://github.com/users/ther12k/projects/3
Project visibility: PUBLIC
Project items: 96
Milestones: 8
Labels: 45 (including GitHub defaults)
Custom fields: Stable ID, Priority, Area, Size, Depends On,
                Blocked By Upstream, Evidence Link, Release Gate
```

Project views created/configured:

1. Ready by milestone — `is:issue`
2. Blocked and upstream-dependent — `is:issue status:Todo`
3. Security/P0 — `is:issue label:"priority:p0" label:"type:security"`
4. HTMX 4 migration — `is:issue milestone:"M7 — HTMX 4 GA Adoption"`
5. Release gate evidence — `is:issue label:"type:release"`
6. Contributor-friendly tasks — `is:issue label:"good-first-issue"`

All 96 issues were added to the project. Representative field verification
confirmed GH-001 and GH-002 have stable IDs, P0 priority, area, size,
dependencies, `M0` release gate, evidence links, and `Done` status.
GH-007 onward remains `Todo`; GH-009 is `In Progress` during this change.

Unsafe default workflows removed:

- `Auto-close issue`
- `Pull request merged`

This is required because GH-009 explicitly forbids closing an issue merely
because a pull request merged without acceptance evidence. GitHub's native
status field exposes `Todo`, `In Progress`, and `Done`; review state remains
represented by pull-request linkage and the repository PR template.

## Known limitation

The live project owner is the user account `ther12k`, not an organization. The
configuration is public and linked to `ther12k/bundar`; moving it to a future
maintainer organization requires a deliberate GitHub project migration.
