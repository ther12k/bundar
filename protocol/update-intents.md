---
type: Protocol Specification
title: Version-Neutral Multi-Region Update Intents
description: Canonical model for replacing, appending, removing, and otherwise updating multiple DOM regions across HTMX dialects.
tags:
- oob
- partials
- updates
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
sources:
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

# Model

```ts
type UpdateIntent =
  | { kind: 'replace'; target: string; content: JSXNode }
  | { kind: 'inner'; target: string; content: JSXNode }
  | { kind: 'append'; target: string; content: JSXNode }
  | { kind: 'prepend'; target: string; content: JSXNode }
  | { kind: 'before'; target: string; content: JSXNode }
  | { kind: 'after'; target: string; content: JSXNode }
  | { kind: 'remove'; target: string };
```

# Rendering

The htmx 2 adapter uses stable OOB-compatible markup and wrapper rules. The htmx 4 adapter may use native partial constructs when GA conformance supports them. Applications express intent, not transport markup.

# Constraints

- Targets are selectors validated as strings but not assumed safe for authorization.
- Duplicate or conflicting updates have deterministic ordering.
- Main content and update-only responses are explicit.
- A raw OOB escape hatch remains available outside portability guarantees.
