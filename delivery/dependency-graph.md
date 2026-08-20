---
type: Delivery Plan
title: Issue Dependency Graph and Execution Waves
description: Topological execution model, stable issue IDs, parallel waves, blocking policy, and graph validation.
tags:
- dependencies
- issues
- dag
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Model

Every issue has a stable `GH-NNN` ID and explicit `depends_on` metadata. The generated graph is validated as acyclic. GitHub issue numbers are secondary and may differ across repositories.

# Recommended waves

```mermaid
flowchart LR
  M0[M0 Contracts] --> M1[M1 Core]
  M0 --> M2[M2 JSX]
  M1 --> M3[M3 HTMX]
  M2 --> M3
  M3 --> M4[M4 Forms & Security]
  M4 --> M5[M5 DX & Apps]
  M5 --> M6[M6 Alpha]
  M3 --> M7[M7 HTMX 4 GA]
  M6 --> M7
```

# Within a milestone

Use the issue index and `github/bulk-issue-creation.md` for topological order. Multiple ready issues may run in parallel, but no agent may assume an unmerged dependency contract.

# Blocking policy

Mark a GitHub issue `status:blocked` when a dependency, upstream release, or decision is unresolved. Do not “complete around” a blocker by introducing an undocumented alternative.
