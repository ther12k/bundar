---
type: Architecture Specification
title: HTMX Protocol Boundary and Dialect Isolation
description: How Bundar contains HTMX major-version differences and protects application code from protocol churn.
tags:
- htmx
- adapter
- compatibility
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
stale_after: '2026-09-21'
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
- id: htmx-4-beta6
  resource: https://github.com/bigskysoftware/htmx/releases/tag/v4.0.0-beta6
  title: htmx 4.0.0-beta6 release
  author: team:htmx
  last_modified: '2026-07-23'
- id: htmx-2-compat
  resource: https://four.htmx.org/extensions/htmx-2-compat
  title: Official htmx 2 compatibility extension for htmx 4
  author: team:htmx
  last_modified: '2026-08-21'
---

# Boundary

HTMX is not imported by `@bundar/core`. The application selects a dialect implementation from `@bundar/htmx` when constructing the app.

```ts
import { htmx2 } from '@bundar/htmx/2';

const app = new Bundar({ htmx: htmx2() });
```

Future switch:

```ts
import { htmx4 } from '@bundar/htmx/4';

const app = new Bundar({ htmx: htmx4() });
```

# Adapter-owned concerns

- Request-header names and value normalization
- Full versus partial request classification
- History restoration behavior and cache-vary keys
- Browser asset and configuration tags
- Lifecycle event-name mapping
- Explicit inheritance helpers
- Extension activation differences
- Error-response swap defaults
- Out-of-band versus htmx 4 partial-update rendering

# Application-owned stable surface

- Common `hx-get`, method, target, trigger, select, history, and swap intents
- `c.htmx` normalized metadata
- `c.view` and `c.action`
- Normalized response directives and update intents
- Framework event names, not raw htmx lifecycle strings

# Escape hatch

Raw HTMX attributes and scripts are legal. The `bundar htmx audit --to 4` command reports constructs outside the stable subset; the zero-change migration promise excludes unresolved findings.
