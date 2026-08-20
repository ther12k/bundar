---
type: Engineering Specification
title: Package API and Export Surface
description: Proposed public exports, internal boundaries, subpath policy, and API review mechanism.
tags:
- api
- packages
- exports
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Public packages

| Package | Core exports |
|---|---|
| `@bundar/core` | `Bundar`, route/module helpers, middleware, context types, `HttpError`, response helpers |
| `@bundar/jsx` | automatic JSX runtime, node types, `raw`, renderers, document helpers |
| `@bundar/htmx` | normalized types and portable helpers |
| `@bundar/htmx/2` | `htmx2` dialect factory |
| `@bundar/htmx/4` | `htmx4` dialect factory |
| `@bundar/schema` | Standard Schema middleware and error model |
| `@bundar/testing` | in-process client, assertions, dialect matrix helpers |
| `@bundar/cli` | programmatic CLI APIs where useful |
| `create-bundar` | project scaffolder executable |

# Export discipline

- Every public export is intentional and listed in package exports.
- Internal files use non-exported paths; users are not promised deep-import stability.
- Types and runtime values use the same import path where practical.
- API report snapshots gate additions/removals.
- Experimental exports carry a namespace or documentation marker and cannot silently become stable.
