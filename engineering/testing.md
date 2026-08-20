---
type: Engineering Standard
title: Testing Strategy
description: Unit, property, integration, browser, security, performance, type, and reference-application tests.
tags:
- testing
- quality
- e2e
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Layers

- Unit tests for route normalization, middleware, context, directives, and renderer primitives.
- Property/fuzz tests for escaping, attributes, headers, path parsing, and malformed multipart inputs.
- Integration tests against a real ephemeral `Bun.serve` listener.
- Type tests for route params, environment variables, JSX attributes, schemas, and forbidden imports.
- Browser conformance with pinned htmx assets.
- JavaScript-disabled browser journeys for progressive enhancement.
- Security tests for XSS, CSRF, cookie defaults, header injection, upload limits, and error disclosure.
- Benchmarks separated from correctness tests.

# Truthfulness

Tests may be skipped only with an explicit tracked reason. A release report lists executed commands and environments. Snapshot updates require review of semantic changes, not blind regeneration.
