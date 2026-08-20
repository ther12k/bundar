---
type: Design Principles
title: Bundar Design Principles
description: Decision heuristics that keep Bundar small, Bun-native, secure, comprehensible, and migration-ready.
tags:
- principles
- architecture
- product
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Principles

1. **Use Bun before wrapping Bun.** Delegate routing, `Request`, `Response`, cookies, static files, streaming, and server lifecycle whenever native behavior is sufficient.
2. **HTML is the application protocol.** Mutations return useful HTML or browser navigation, not JSON that requires a client renderer.
3. **Progressive enhancement is executable, not aspirational.** Forms keep valid `method` and `action`; links keep `href`; non-HTMX fallbacks are tested.
4. **Explicit beats magical.** Handlers return responses. Middleware order is visible. Context additions are typed and intentional.
5. **One server render model.** JSX produces HTML; it does not become a browser component runtime.
6. **Dialect boundaries absorb dependency churn.** Application code reads normalized HTMX metadata and emits normalized directives.
7. **Secure by construction.** Text escapes by default, raw HTML is marked, CSRF is first-class, and unsafe browser features require deliberate opt-in.
8. **Build-time work should not become request-time work.** Route grouping, middleware composition, route manifests, and asset resolution happen at startup or build time.
9. **Fast paths remain real.** Static responses and policy-free handlers avoid unnecessary context, promise, and parsing allocations.
10. **Evidence precedes claims.** Compatibility, performance, security, and release status require reproducible artifacts.
11. **Escape hatches are honest.** Raw Bun, raw HTMX attributes, custom responses, and ordinary JavaScript remain available, but leave the guaranteed subset when used.
12. **A narrow excellent framework beats a broad mediocre one.** Reject features that recreate Elysia, Hono, React, an ORM, or htmx inside Bundar.
