---
type: Risk Register
title: Bundar Risk Register
description: Product, technical, compatibility, security, performance, naming, ecosystem, and delivery risks with mitigations.
tags:
- risk
- mitigation
- governance
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Risks

| ID | Risk | Likelihood / impact | Mitigation |
|---|---|---|---|
| R-01 | Bundar becomes a smaller clone of Hono or Elysia without distinct value. | Medium / High | Gate features against page/fragment/action and Bun-native differentiation. |
| R-02 | Custom JSX renderer contains XSS defects. | Medium / Critical | Branded raw HTML, property tests, adversarial corpus, security review. |
| R-03 | HTMX 4 GA differs materially from beta6. | High / Medium | Experimental label, source diff, adapter boundary, M7 gate. |
| R-04 | Native Bun routing lacks a required behavior. | Medium / High | Early spike, stop condition, delegate or explicitly limit scope. |
| R-05 | Framework overhead erases native advantage. | Medium / High | Static fast path, startup composition, budgets, raw data. |
| R-06 | Type inference harms editor performance. | Medium / Medium | Route-local inference, explicit env, generated manifests, timed type tests. |
| R-07 | Name/package/trademark conflict. | Unknown / High | GH-004 clearance and fallback scope. |
| R-08 | Too many packages or concepts overwhelm users. | Medium / Medium | Three-package basic story, progressive docs, CLI scaffold. |
| R-09 | Progressive fallback is untested and rots. | Medium / High | No-JS E2E gate. |
| R-10 | Pre-1.0 churn discourages adoption. | Medium / Medium | API snapshots, migration notes, small releases. |
