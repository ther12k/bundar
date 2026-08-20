---
type: Engineering Standard
title: Benchmark Plan and Performance Budgets
description: Comparable workloads, methodology, raw Bun and Hono baselines, budgets, reporting, and anti-gaming rules.
tags:
- performance
- benchmark
- bun
- hono
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
sources:
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
---

# Workloads

1. Static `Response` route.
2. Dynamic text response.
3. Parameterized route.
4. One sync middleware and one async middleware.
5. Escaped JSX fragment.
6. Async JSX component.
7. Page/fragment negotiation.
8. URL-encoded validated form.
9. Streaming HTML under a slow client.

# Comparators

Raw Bun is the native ceiling. Hono on Bun is the ergonomic framework reference. Comparators implement equivalent semantics, headers, and payloads.

# Initial budgets

Budgets are hypotheses to validate in M0/M1, not achieved claims:

- Static response path should remain within measurement noise of raw Bun by delegating directly.
- Dynamic no-middleware throughput target: at least 90% of equivalent raw Bun.
- One-middleware target: at least 85% of equivalent raw Bun.
- No unbounded memory growth under slow streaming clients or aborted uploads.
- Core startup and memory regressions receive thresholds after baseline evidence exists.

# Reporting

Publish hardware, OS, kernel, Bun version, CPU governor, concurrency, duration, warmup, commands, raw samples, median and dispersion. Do not publish only the best run.
