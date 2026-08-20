---
type: Protocol Specification
title: Bundar Stable HTMX Subset
description: Conservative attributes and behaviors that receive the zero-application-change HTMX 2 to 4 migration guarantee.
tags:
- stable-subset
- migration
- compatibility
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
sources:
- id: htmx-2-docs
  resource: https://htmx.org/docs/
  title: htmx 2 documentation
  author: team:htmx
  last_modified: '2026-08-21'
- id: htmx-4-docs
  resource: https://four.htmx.org/docs
  title: htmx 4 beta documentation
  author: team:htmx
  last_modified: '2026-08-21'
---

# Guaranteed common intents

- Request methods: GET, POST, PUT, PATCH, DELETE.
- Explicit target on the requesting element.
- Core swap modes common to both major versions: `innerHTML`, `outerHTML`, `beforebegin`, `afterbegin`, `beforeend`, `afterend`, `delete`, and `none`.
- Basic triggers and timing modifiers represented through typed intent helpers.
- Selection, push URL, replace URL, boost, indicator, disabled element, and sync behavior where conformance fixtures prove parity.
- Server response directives represented by Bundar helpers.
- Page/fragment negotiation through `c.view`.
- Mutation outcomes through `c.action` and normalized update intents.

# Excluded unless adapter helper is used

- Implicit inherited attributes.
- Raw htmx lifecycle event names.
- Custom extension APIs.
- `hx-ext`, `hx-disinherit`, `hx-inherit`, and `hx-request`.
- Assumptions about 4xx/5xx swapping.
- Assumptions about local history cache.
- Complex OOB wrapper stripping or htmx 4 partial tags.
- Direct parsing of request `HX-Trigger`, `HX-Source`, or `HX-Request-Type`.

# Audit rule

The CLI classifies usage as `portable`, `adapter-owned`, `version-specific`, or `unknown`. Only unresolved `portable` and `adapter-owned` usage qualifies for the zero-change migration gate.
