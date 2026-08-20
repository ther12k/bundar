---
type: Delivery Plan
title: Workstreams and Ownership Model
description: Parallel engineering workstreams, interfaces, coordination points, and recommended reviewer skills.
tags:
- workstreams
- ownership
- coordination
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Workstreams

| Workstream | Scope | Coordination points |
|---|---|---|
| Core | routes, context, middleware, errors | JSX response interface, dialect capability interface |
| JSX | renderer, escaping, stream | core response helper, HTMX attribute types |
| HTMX | adapters, assets, conformance | JSX updates, view/action, browser harness |
| Forms/security | parsing, validation, CSRF, cookies, CSP | action responses, renderer trust boundary |
| Tooling/DX | CLI, manifests, testing, examples | all public package APIs |
| Release/quality | CI, benchmarks, supply chain, docs | every milestone gate |

# Ownership rule

A workstream may implement internals independently only after shared interfaces are accepted. Interface changes require affected workstream review and an ADR when architectural.
