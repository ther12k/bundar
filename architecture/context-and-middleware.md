---
type: Architecture Specification
title: Context, Services, Variables, Guards, and Middleware
description: Request context shape, typed environment, middleware composition, authorization guards, and mutation boundaries.
tags:
- context
- middleware
- guards
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Context shape

```ts
interface Context<Env, Path extends string = string> {
  request: Bun.BunRequest<Path>;
  params: RouteParams<Path>;
  url: URL;
  cookies: CookieMap;
  services: Env['services'];
  var: Env['variables'];
  htmx: HtmxRequestMeta;
  get<K extends keyof Env['variables']>(key: K): Env['variables'][K];
  set<K extends keyof Env['variables']>(key: K, value: Env['variables'][K]): void;
  html(node: JSXNode, init?: ResponseInit): Response;
  view(spec: ViewSpec): Response | Promise<Response>;
  action(spec: ActionSpec): Response | Promise<Response>;
  json(value: unknown, init?: ResponseInit): Response;
  redirect(url: string, status?: 302 | 303 | 307 | 308): Response;
}
```

# Middleware

Middleware receives `(context, next)`. Registration order controls entry; unwinding controls post-processing. Middleware may short-circuit with a response.

# Guards

Guards are ordinary middleware with a documented context contract. Authentication and authorization stay application concerns; Bundar supplies composition and secure helper patterns, not an identity product.

# State rules

- Services are application-lifetime dependencies supplied at app construction.
- Variables are request-scoped and typed by the application environment.
- No global service locator or decorator metadata is required.
- Middleware cannot mutate the route table after compilation.
- Response headers should be changed through response cloning or helper utilities before a stream commits.

# Type complexity budget

Avoid inference chains that make editor performance depend on the entire application. Route-local types and explicit `AppEnv` declarations are preferred to whole-program treaty inference.
