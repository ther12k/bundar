---
type: Product Strategy
title: Success Metrics and Evaluation Model
description: Adoption, developer experience, compatibility, performance, quality, and sustainability measures for Bundar.
tags:
- metrics
- evaluation
- success
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# North-star outcome

A developer can ship a secure, progressively enhanced business workflow with substantially less client-side state and integration plumbing than an equivalent general-purpose backend-plus-template setup.

# Measured dimensions

## Developer experience

- Time from scaffold to working full-page and fragment route.
- Number of concepts required to understand a basic app.
- Type-check latency and editor responsiveness on the reference admin app.
- Errors caught at compile time versus runtime.
- Number of application-file changes required for htmx 2 to 4 migration; stable-subset target is zero.

## Runtime

- Startup time, resident memory, throughput, and latency against raw Bun and Hono baselines.
- Allocation count for static routes, dynamic HTML, one middleware, and validated forms.
- Streaming backpressure behavior and aborted-request cleanup.

## Quality

- Conformance cases by HTMX dialect.
- Escaping and security test coverage by threat class.
- Public API change count and deprecation duration.
- Reference-app E2E pass rate with JavaScript enabled and disabled.

## Ecosystem

- Independent applications and contributors after alpha.
- Time to review and merge small issues.
- Number of optional integrations that do not require core changes.

# Anti-metrics

GitHub stars, synthetic request-per-second screenshots, package-count growth, and feature-count comparisons are not sufficient measures of product quality.
