---
type: Knowledge Bundle Guide
title: Bundar Framework Design and GitHub Delivery Bundle
description: Entry guide for the Bun-native JSX and HTMX framework design, issue backlog, dependency graph, and implementation handoff.
tags:
- bundar
- bun
- tsx
- jsx
- htmx
- okf
- github
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
sources:
- id: okf-spec
  resource: https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md
  title: Open Knowledge Format v0.2 Specification
  author: team:google-cloud-knowledge-catalog
  last_modified: '2026-08-21'
- id: bun-1-4
  resource: https://bun.com/blog/bun-v1.4
  title: Bun 1.4 release notes
  author: team:bun
  last_modified: '2026-08-20'
- id: htmx-2-docs
  resource: https://htmx.org/docs/
  title: htmx 2 documentation
  author: team:htmx
  last_modified: '2026-08-21'
- id: htmx-4-docs
  resource: https://four.htmx.org/docs
  title: htmx 4 beta documentation
  author: team:htmx
  last_modified: '2026-08-21'
---

# Bundar

**Bundar** is the selected name for a Bun-native, HTML-first TypeScript framework built around server-rendered JSX and official htmx. The working tagline is **“HTML comes full circle.”**

This archive is a design and delivery package, not an implementation. Every design, ADR, requirement, task, and gate remains `draft` until reviewed and backed by repository evidence.

## Intended stack

```text
Bun 1.4+
  └── Bundar
       ├── native Bun.serve route compilation
       ├── server-only JSX renderer
       ├── page / fragment / action responses
       ├── forms, validation, security primitives
       └── versioned htmx dialect adapter
            ├── htmx 2 stable profile
            └── htmx 4 profile, experimental until GA gates pass
```

## Read first

1. [Project charter](project/charter.md)
2. [System overview](architecture/system-overview.md)
3. [HTMX migration contract](protocol/migration-contract.md)
4. [Roadmap](delivery/roadmap.md)
5. [Issue dependency graph](delivery/dependency-graph.md)
6. [Master agent prompt](MASTER_AGENT_PROMPT.md)
7. [Bulk GitHub issue creation guide](github/bulk-issue-creation.md)

## Trust boundary

The package records source observations current on **August 21, 2026**. Bun 1.4 was released on August 20, 2026. htmx 2 is the stable baseline; htmx 4 was observed at `4.0.0-beta6` and must not be treated as a frozen GA contract. Package names, GitHub organization names, domains, and trademarks require an explicit availability and legal-clearance task before publication.

## What “easy HTMX 4 switching” means

Reference applications must run under htmx 2 and htmx 4 by changing only the selected adapter and installed htmx version. Route handlers, application components, form workflows, and domain logic must not change. Raw use of version-specific htmx features is allowed only behind an escape hatch and is reported by the migration audit command.

## Implementation status

This repository now hosts the Bundar implementation alongside the design corpus. Work executes through the [issue backlog](issues/index.md) in dependency order; progress is recorded in [log.md](log.md) and in per-issue closure records under `evidence/`.

Toolchain requirements: Bun >= 1.4.0 (preflight fails closed otherwise). No Node package manager is needed.

```bash
bun install --frozen-lockfile   # install
bun run preflight               # verify the runtime
bun run format:check            # formatting
bun run lint                    # eslint
bun run typecheck               # strict tsc
bun test                        # bun:test
bun run build                   # build all workspace packages
bun run clean                   # remove build artifacts
```

Completed: GH-001 (workspace skeleton), GH-002 (governance, MIT license, security policy), GH-003 (OKF corpus + local validator: `docs:validate`, `docs:links`, `issues:graph`), GH-004 (brand clearance — ADR-0015; all identifiers temporary until reserved; planned GitHub org: `bundarjs`). In progress: GH-005. Next ready: GH-009.

