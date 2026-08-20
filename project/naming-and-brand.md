---
type: Brand Specification
title: Bundar Naming and Brand System
description: Selected product name, meaning, pronunciation, identifiers, tagline, naming safeguards, and fallback namespace policy.
tags:
- brand
- naming
- bundar
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
sources:
- id: bundar-word
  resource: https://kbbi.web.id/bundar
  title: Indonesian dictionary entry for bundar
  author: publisher:kbbi-web
  last_modified: '2025-12-31'
---

# Decision

The selected framework name is **Bundar**.

- Pronunciation: approximately `BOON-dar`, using Indonesian pronunciation.
- Working tagline: **HTML comes full circle.**
- Descriptive phrase: **The Bun-native hypermedia framework.**
- Repository working name: `bundar`.
- CLI working name: `bundar`.
- Package scope proposal: `@bundar/*`.

# Proposed package identifiers

```text
@bundar/core
@bundar/jsx
@bundar/htmx
@bundar/schema
@bundar/testing
@bundar/cli
create-bundar
```

Adapter subpaths:

```ts
import { htmx2 } from "@bundar/htmx/2";
import { htmx4 } from "@bundar/htmx/4";
```

# Brand safeguards

The selected name is a product decision, not evidence that npm scopes, GitHub organizations, domains, social handles, or trademarks are available. Before public announcement, complete issue `GH-004` and record searches, registrations, legal review when appropriate, and a fallback namespace.

Preferred fallback order if `@bundar` is unavailable:

1. Keep public product name **Bundar** and use `@bundarjs/*`.
2. Keep CLI `bundar` if available; otherwise use `bundarjs` while retaining `bundar` as the documented command through a package bin alias when lawful.
3. Do not rename the product merely because an unscoped npm package is occupied.

# Voice

Technical, calm, direct, and HTML-positive. Avoid claims that imply Bundar invented hypermedia, replaces htmx, or is universally faster than established frameworks.
