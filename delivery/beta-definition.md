---
type: Release Definition
title: Beta Readiness Definition
description: Conditions beyond alpha required before Bundar may be described as beta-ready.
tags:
- beta
- readiness
- quality
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Beta requires

- At least two non-trivial reference applications and one independent adopter or external design review.
- No open P0 issue; bounded, documented P1 list.
- Stable core/JSX/htmx2 public API with migration notes from alpha.
- Reproducible CI on supported Bun platforms.
- Security review of renderer, forms, assets, and proxy handling.
- Performance budgets sustained over multiple CI runs.
- Installation, upgrade, deployment, troubleshooting, and contribution documentation.
- Package namespace and legal clearance completed.
- htmx 4 status stated accurately; GA support is not mandatory for beta if upstream is not GA, but migration architecture must remain proven.

Alpha completion alone does not imply beta readiness.
