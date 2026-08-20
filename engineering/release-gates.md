---
type: Engineering Standard
title: Milestone and Release Gates
description: Evidence-based exit conditions for architecture, core, JSX, HTMX, forms, tooling, alpha, and HTMX 4 GA support.
tags:
- release
- gates
- milestones
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Gate policy

A milestone closes only when every required issue is complete, commands have run, evidence is linked, and open deviations have explicit decisions.

# Gates

- **M0:** package/brand decisions, repository, OKF validation, boundary tests, benchmark and browser harnesses exist.
- **M1:** native route compilation, context, middleware, errors, tests, and performance budget pass.
- **M2:** JSX semantics, escaping, async/streaming, HTMX common attributes, security tests, and renderer benchmark pass.
- **M3:** both dialect adapters, view/action behavior, cache variation, event/update mapping, dual browser suites, and zero-handler-change fixture pass.
- **M4:** forms, validation, CSRF, cookies, uploads, CSP, limits, and adversarial tests pass.
- **M5:** CLI, scaffolder, typed routes, test client, reference apps, audit tool, and usability review pass.
- **M6:** full matrix, benchmark report, package audit, SBOM/provenance, publish dry run, documentation, and alpha release review pass.
- **M7:** htmx 4 GA exists; source diff, adapter update, dual CI, unchanged reference apps, migration report, default-dialect ADR, and release pass.

# Stop-ship examples

Escaping bypass, CSRF failure, route ownership ambiguity, unbounded request buffering, broken no-JS fallback, undocumented version-specific behavior, failed package provenance, or compatibility claims based only on beta after GA.
