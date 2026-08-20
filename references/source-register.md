---
type: Reference Register
title: External Source Register and Precedence
description: Official and contextual sources used to design Bundar, with observation date, purpose, and trust limitations.
tags:
- references
- sources
- provenance
status: stable
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
stale_after: '2026-09-01'
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
- id: bun-routing
  resource: https://bun.com/docs/runtime/http/routing
  title: Bun.serve routing documentation
  author: team:bun
  last_modified: '2026-08-21'
- id: hono-jsx
  resource: https://hono.dev/docs/guides/jsx
  title: Hono JSX guide
  author: team:hono
  last_modified: '2026-08-12'
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
- id: htmx-4-beta6
  resource: https://github.com/bigskysoftware/htmx/releases/tag/v4.0.0-beta6
  title: htmx 4.0.0-beta6 release
  author: team:htmx
  last_modified: '2026-07-23'
- id: htmx-2-compat
  resource: https://four.htmx.org/extensions/htmx-2-compat
  title: Official htmx 2 compatibility extension for htmx 4
  author: team:htmx
  last_modified: '2026-08-21'
- id: bundar-word
  resource: https://kbbi.web.id/bundar
  title: Indonesian dictionary entry for bundar
  author: publisher:kbbi-web
  last_modified: '2025-12-31'
---

# Precedence

1. Current official runtime/library documentation and release artifacts.
2. Implemented code and executed conformance tests in the future repository.
3. Accepted Bundar ADRs and protocol profiles.
4. This generated design narrative.

# Observed source state

- OKF v0.2 specification: bundle and frontmatter format.
- Bun 1.4 release dated August 20, 2026: runtime baseline and native directory routes.
- Bun routing documentation: native route-table design.
- Hono JSX guide: ergonomic and competitive reference, not a Bundar dependency decision.
- htmx 2 documentation: stable baseline observed at 2.0.10.
- htmx 4 documentation and beta6 release: experimental profile only.
- Official `htmx-2-compat` extension: migration reference, not Bundar’s permanent architecture.
- Indonesian dictionary entry: naming meaning; legal clearance is separate.

# Freshness

Fast-moving runtime and HTMX facts must be rechecked before implementation or release. A source note becoming stale does not automatically invalidate stable architectural principles, but it invalidates “current version” claims.
