---
type: Engineering Standard
title: Type-System and Editor-Performance Policy
description: Type inference boundaries, route parameter extraction, context typing, compile-time budgets, and API snapshots.
tags:
- typescript
- types
- editor-performance
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Goals

Catch route parameter, context variable, form input, JSX attribute, and response-helper mistakes without making the editor analyze the entire app graph.

# Rules

- Derive params from one literal path at a time.
- Use explicit application environment types for services and variables.
- Avoid recursive tuple accumulation across all routes.
- Generated route clients/manifests handle whole-app contracts outside the interactive type path.
- Publish type tests and API report snapshots.
- Measure `tsc --noEmit` and editor-oriented test project time on the admin reference app.
- A type feature may be rejected when it materially harms editor responsiveness even if technically possible.
