---
type: AI Agent Implementation Prompt
title: Master Implementation Prompt — Bundar M0 through HTMX 4 GA
description: Source-of-truth instructions, reading order, invariants, dependency rules, evidence requirements, and stop conditions for coding agents.
tags:
- agent
- handoff
- implementation
- dependencies
- evidence
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

# Mission

Build Bundar as a small Bun-native, HTML-first TypeScript framework with server-only JSX and first-class htmx support. Execute work through the GitHub-ready tasks under [`issues/`](issues/), honoring their dependency graph and milestone gates.

# Required reading order

1. [`README.md`](README.md)
2. [`project/charter.md`](project/charter.md)
3. [`project/requirements.md`](project/requirements.md)
4. [`architecture/system-overview.md`](architecture/system-overview.md)
5. [`architecture/htmx-boundary.md`](architecture/htmx-boundary.md)
6. [`protocol/migration-contract.md`](protocol/migration-contract.md)
7. [`engineering/repository-layout.md`](engineering/repository-layout.md)
8. [`engineering/release-gates.md`](engineering/release-gates.md)
9. The selected issue and every direct dependency linked from it.

# Non-negotiable invariants

1. Bun is the only supported runtime in the initial major line.
2. Bundar compiles routes to `Bun.serve({ routes })`; it does not implement a second general-purpose router.
3. Route handlers return `Response` or `Promise<Response>`. Convenience helpers produce responses but do not create an implicit return-value language.
4. JSX renders HTML on the server. There is no virtual DOM, hydration, hooks, or React-compatibility promise.
5. Official htmx remains the browser hypermedia runtime. Bundar does not fork or reimplement htmx.
6. `@bundar/core` and `@bundar/jsx` have zero runtime dependencies unless an ADR explicitly changes that policy.
7. htmx protocol differences are isolated in `@bundar/htmx` dialect adapters and conformance fixtures.
8. The default adapter is htmx 2 until htmx 4 GA exists and every M7 gate passes.
9. Applications written to the Bundar stable HTMX subset switch dialects without route-handler or component edits.
10. No performance, security, compatibility, or release claim is marked passing without a recorded command and artifact.

# Task execution protocol

- Select only an issue whose dependencies are complete.
- Keep each pull request scoped to one issue unless the issue explicitly authorizes a combined change.
- Record commands, environment, versions, output summary, benchmark raw data, and relevant screenshots or traces.
- Update affected OKF concepts and the root `log.md` in the implementation repository.
- Add or update tests in the same pull request as behavior changes.
- Do not silently weaken acceptance criteria. Open a decision issue when a contract is unimplementable or contradicted by measured evidence.

# HTMX version discipline

- Stable lane: latest supported htmx 2.x patch pinned in the lockfile and compatibility matrix.
- Experimental lane: explicitly pinned htmx 4 pre-release until GA.
- No code may infer request semantics by reading raw `HX-*` headers outside the adapter package.
- No core component may embed raw htmx lifecycle event names.
- No test may claim htmx 4 GA compatibility while the tested version is a beta or release candidate.
- The switch gate runs the same reference-app source tree against both dialects and checks for a zero-diff application layer.

# Stop conditions

Stop the current issue and open a decision or blocker issue when any of the following occurs:

- Bun’s documented native route behavior cannot represent a required route contract.
- A proposed convenience API requires a second router or mandatory client runtime.
- The JSX renderer cannot guarantee escaping at a documented trust boundary.
- htmx 4 GA materially differs from the recorded beta profile.
- A performance target encourages unsafe behavior or cannot be reproduced.
- A package, organization, or trademark conflict invalidates the proposed public namespace.

# Completion response expected from an agent

Report the stable issue ID, commit, files changed, tests and exact commands, evidence locations, remaining risks, documentation changes, and which dependent issues are now unblocked. Never report a gate as complete solely because code was written.
