---
type: Engineering Standard
title: Coding and Review Standards
description: TypeScript style, error handling, performance discipline, test truthfulness, comments, and review expectations.
tags:
- coding
- review
- typescript
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Standards

- Strict TypeScript; no unexplained `any`, broad casts, or non-null assertions at trust boundaries.
- Prefer small pure functions and explicit data structures over class hierarchies.
- Validate external strings before header, path, URL, selector, or HTML-sensitive use.
- Do not allocate context fields or parse bodies eagerly.
- Preserve synchronous return paths when inputs and handlers are synchronous.
- Errors include stable codes where callers need branching.
- Comments explain invariants and reasons, not restate syntax.
- Public behavior changes include documentation and tests.
- No ignored test failures, unconditional `|| true`, or benchmark cherry-picking.

# Review checklist

API effect, Bun-native delegation, cross-dialect behavior, escaping/security, abort/stream cleanup, allocation impact, type complexity, compatibility evidence, docs updates, and dependency changes.
