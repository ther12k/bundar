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
The lines above are a historical snapshot from the GH-009 implementation run;
the final-state audit below supersedes its temporary `In Progress` wording.

## Final-state audit (2026-08-21)

- Repository: `https://github.com/ther12k/bundar`
- Project: `https://github.com/users/ther12k/projects/3`
- GH-004, GH-005, GH-006, GH-007: GitHub issues remain open because the live
  repository uses evidence comments and project status as separate closure
  records; their implementation commits are merged in `main`.
- GH-008: GitHub issue closed; project status `Done`.
- GH-009: implementation is merged in `main`; project status remains `In Progress`
  pending this M0 gate's final dependency audit.
- GH-010: project status `Todo` before this gate.

This transcript intentionally preserves the original setup snapshot and records
that live GitHub issue state is not itself treated as proof of acceptance. The
M0 gate uses the committed issue closure records and durable evidence transcripts
as the acceptance basis, and will update project metadata only after the gate
commit is merged.


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
