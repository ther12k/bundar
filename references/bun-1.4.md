---
type: Reference
title: Bun 1.4 Design-Relevant Notes
description: Source-derived Bun 1.4 facts that shape the framework design and must be revalidated over time.
tags:
- bun
- runtime
- reference
status: stable
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
stale_after: '2026-09-21'
sources:
- id: bun-1-4
  resource: https://bun.com/blog/bun-v1.4
  title: Bun 1.4 release notes
  author: team:bun
  last_modified: '2026-08-20'
---

# Observed facts

Bun 1.4 was released on August 20, 2026. The release reports a Rust rewrite, startup/memory/idle improvements, broader compatibility, static directory routes in `Bun.serve`, streaming backpressure improvements, and expanded tooling.

# Design use

Bundar adopts Bun 1.4 as its initial minimum so it can delegate static directories, conditional/range file behavior, route tables, tests, package management, and runtime execution to Bun.

# Caution

Release-note performance numbers are upstream claims under upstream workloads. Bundar must run its own framework benchmarks and cannot repeat those numbers as Bundar results.
