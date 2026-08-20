---
type: Roadmap
title: Bundar Implementation Roadmap
description: Milestone sequence from contracts to alpha and stable htmx 4 support.
tags:
- roadmap
- milestones
- delivery
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Sequence

| Milestone | Outcome | Depends on |
|---|---|---|
| M0 — Contracts & Foundation | Repository, governance, architecture freeze, harnesses | none |
| M1 — Bun-native HTTP Core | Route compilation, context, middleware, responses | M0 |
| M2 — Server JSX | Safe HTML renderer and response integration | M0, selected M1 contracts |
| M3 — HTMX Dialects | htmx 2 stable and htmx 4 experimental profiles | M1, M2 |
| M4 — Forms & Security | Production-shaped form workflows and secure defaults | M1–M3 |
| M5 — DX & Reference Apps | CLI, typed routes, test client, examples, docs | M1–M4 |
| M6 — Alpha | Full evidence, packaging, publish, known limits | M0–M5 |
| M7 — HTMX 4 GA | Stable v4 support and default decision | HTMX 4 GA, M3, M5, M6 |

# Parallelism

M1 routing and M2 renderer foundations may proceed in parallel after shared contracts freeze. M3 request/response adapters may proceed in parallel, but cross-dialect action and app fixtures wait for both. Documentation, security review, and benchmark collection should run continuously, not as end-stage cleanup.

# Release intent

M6 produces `v0.1.0-alpha.1`. Beta readiness requires real user feedback, API stabilization, and unresolved P0/P1 closure beyond this design pack. M7 timing is driven by actual htmx 4 GA, not an assumed date.
