---
type: Engineering Specification
title: Repository Layout and Ownership Boundaries
description: Proposed monorepo structure, package ownership, examples, fixtures, documentation, and generated artifacts.
tags:
- repository
- monorepo
- packages
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Layout

```text
/
  package.json
  bun.lock
  bunfig.toml
  tsconfig.base.json
  packages/
    core/
    jsx/
    htmx/
    schema/
    testing/
    cli/
  create-bundar/
  examples/
    minimal/
    todo/
    admin-crud/
  fixtures/
    htmx2/
    htmx4/
    cross-dialect-app/
  benchmarks/
    raw-bun/
    hono/
    bundar/
  docs/okf/
  scripts/
  .github/
```

# Boundaries

- `core` may import only web/Bun APIs and explicitly shared internal types within its package.
- `jsx` cannot import `core` or `htmx`.
- `htmx` may import JSX public types but not CLI or examples.
- `schema`, `testing`, and `cli` consume public package APIs.
- Examples cannot be imported by packages.
- Benchmark implementations must represent equivalent behavior and keep framework-specific tuning documented.

# Generated files

Route manifests, API reports, benchmark outputs, coverage, build assets, and package tarballs go to ignored artifact directories except intentionally checked-in golden snapshots.
