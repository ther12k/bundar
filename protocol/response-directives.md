---
type: Protocol Specification
title: Normalized HTMX Response Directives
description: Canonical server directives for navigation, history, target, swap, selection, refresh, and client events.
tags:
- response-headers
- navigation
- events
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

# Model

```ts
interface HtmxResponseDirectives {
  location?: string | LocationSpec;
  redirect?: string;
  refresh?: boolean;
  pushUrl?: string | false;
  replaceUrl?: string | false;
  retarget?: string;
  reselect?: string;
  reswap?: HtmxSwap;
  trigger?: EventMap;
  triggerAfterSwap?: EventMap;
  triggerAfterSettle?: EventMap;
}
```

# Rules

- Adapter serialization owns exact header names and JSON encoding.
- Event maps use deterministic JSON and reject unsupported values such as functions or cyclic objects.
- Redirect and location helpers avoid 3xx HTMX response-header traps by producing dialect-correct responses.
- Header values are validated against CR/LF injection.
- Multiple middleware layers merge directives through documented precedence rather than blind concatenation.

# Stable surface

Most response header names remain compatible across htmx 2 and 4, but Bundar retains the adapter boundary to handle semantics, future changes, and test evidence consistently.
