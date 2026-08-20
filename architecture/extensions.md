---
type: Architecture Specification
title: Extension and Plugin Model
description: Composition rules for optional packages without runtime discovery, hidden scopes, or core dependency inversion.
tags:
- plugins
- extensions
- packages
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Model

A Bundar extension is an ordinary TypeScript function that registers middleware, routes, services, assets, or build hooks through explicit public interfaces.

```ts
const app = new Bundar();
app.use(requestId());
app.install(sessionPlugin(options));
app.mount('/admin', adminModule);
```

# Constraints

- No runtime package scanning or global plugin registry.
- No plugin may mutate already-compiled routes.
- Installation order is visible and deterministic.
- Plugin capabilities and required framework versions are declared.
- Version-specific htmx browser extensions are registered through the selected dialect, not injected ad hoc by core.
- Optional integrations cannot become transitive runtime dependencies of core.

# Compatibility

Public extension interfaces receive type snapshots and semantic-versioning treatment. Plugins that use raw internal compiler structures have no stability guarantee.
