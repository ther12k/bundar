---
type: Migration Specification
title: HTMX 2 to HTMX 4 Migration Contract
description: Concrete zero-change goal, source restrictions, switch procedure, test gates, and fallback strategy for moving Bundar applications to htmx 4.
tags:
- migration
- htmx4
- contract
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
stale_after: '2026-09-01'
sources:
- id: htmx-4-docs
  resource: https://four.htmx.org/docs
  title: htmx 4 beta documentation
  author: team:htmx
  last_modified: '2026-08-21'
- id: htmx-2-compat
  resource: https://four.htmx.org/extensions/htmx-2-compat
  title: Official htmx 2 compatibility extension for htmx 4
  author: team:htmx
  last_modified: '2026-08-21'
---

# Contract

A Bundar application that passes the stable-subset audit must migrate from htmx 2 to htmx 4 by changing only:

1. the installed `htmx.org` version;
2. the adapter import from `@bundar/htmx/2` to `@bundar/htmx/4`;
3. optional deployment configuration explicitly owned by the adapter.

Route handlers, middleware, JSX application components, validation code, domain services, and tests expressed through Bundar’s normalized test API must remain unchanged.

# Enforcement

- Compile one reference app source tree into two test variants.
- Run full-page, fragment, form validation, redirect, history, error, event, OOB/update, and no-JavaScript journeys.
- Compare route and component Git trees before and after switch; allowed changes are maintained in an explicit path allowlist.
- Run `bundar htmx audit --to 4 --strict`; unresolved version-specific findings fail the gate.
- Snapshot adapter-owned HTML separately so expected script/config differences do not hide application differences.

# GA procedure

1. Record the official GA version and source date.
2. Diff GA documentation and release notes against the last beta profile.
3. Update adapter capabilities and conformance fixtures.
4. Run dual-version CI and unchanged-app tests.
5. Publish a migration report with known gaps.
6. Accept an ADR before changing default dialect.

# Fallback

If GA changes invalidate zero-change support, keep htmx 2 as default, preserve the v4 adapter as experimental, and expose the incompatibilities rather than hiding them behind fragile client shims.
