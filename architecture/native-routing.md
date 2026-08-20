---
type: Architecture Specification
title: Native Bun Routing and Route Compilation
description: Route registration API, path grammar, conflict detection, native compilation, type extraction, and fallthrough behavior.
tags:
- routing
- bun-serve
- compiler
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
sources:
- id: bun-routing
  resource: https://bun.com/docs/runtime/http/routing
  title: Bun.serve routing documentation
  author: team:bun
  last_modified: '2026-08-21'
- id: bun-1-4
  resource: https://bun.com/blog/bun-v1.4
  title: Bun 1.4 release notes
  author: team:bun
  last_modified: '2026-08-20'
---

# Principle

Bundar is a route **compiler and organizer**, not a second matcher. `app.get`, `app.post`, groups, and modules produce descriptors that compile into Bun’s `routes` object.

# Registration API

```ts
const app = new Bundar<AppEnv>();

app.get('/health', new Response('OK'));
app.get('/users/:id', showUser);
app.post('/users', createUser);
app.group('/admin', admin => {
  admin.use(authenticated, adminOnly);
  admin.get('/users', listUsers);
});

export default app.compile();
```

# Compile rules

- Normalize method names and paths without changing Bun’s documented grammar.
- Group methods under one path entry.
- Preserve direct `Response` entries where Bun supports them.
- Reject duplicate method/path ownership with an actionable diagnostic showing both registrations.
- Delegate static/parameter/wildcard precedence to Bun; do not create independent precedence logic.
- Route registration closes after `compile()`.

# Type rules

A type-level path parser derives parameter names from literal paths. It must degrade safely to `Record<string, string>` when a non-literal path is used rather than producing incorrect certainty.

# Method behavior

Follow Bun’s HEAD behavior where documented, but expose an explicit HEAD handler. OPTIONS behavior is application-controlled unless an optional middleware generates it. Unmatched routes enter the compiled not-found handler; method mismatches follow a documented 404/405 policy chosen by ADR before alpha.
