---
type: Protocol Specification
title: Normalized HTMX Request Metadata
description: Canonical request representation independent of HTMX 2 and HTMX 4 header differences.
tags:
- request-headers
- htmx2
- htmx4
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
interface HtmxRequestMeta {
  isHtmx: boolean;
  dialect: 'htmx2' | 'htmx4' | 'unknown';
  representation: 'partial' | 'full' | 'unknown';
  boosted: boolean;
  historyRestore: boolean;
  currentUrl?: string;
  target?: { raw: string; id?: string; tag?: string };
  source?: { raw: string; id?: string; tag?: string; name?: string };
  prompt?: string;
  raw: Readonly<Record<string, string>>;
}
```

# Mapping

htmx 2 derives source ID and name from `HX-Trigger` and `HX-Trigger-Name`; htmx 4 uses `HX-Source` with a `tag#id` form and removes trigger-name semantics. htmx 4 introduces `HX-Request-Type`; htmx 2 representation is inferred from request/history context.

# Parsing rules

- Header matching is case-insensitive through `Headers`.
- Invalid URLs remain raw strings and produce diagnostics; they do not throw during metadata parsing.
- Missing fields are `undefined`, not fabricated.
- Applications cannot rely on `source.name` across dialects.
- Proxy and origin security do not trust `HX-Current-URL` as an authorization source.
