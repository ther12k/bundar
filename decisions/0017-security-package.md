---
type: Architecture Decision
title: "ADR-0017 — Add the @bundar/security Package for CSRF Primitives"
description: Supersedes ADR-0016's package map by adding one package, @bundar/security, owning CSRF token and origin-verification primitives; no existing edge changes.
tags:
- adr
- architecture-decision
- security
- packages
- gh-061
status: draft
generated:
  by: agent/zcode
  at: '2026-08-22T00:00:00+07:00'
decision:
  id: ADR-0017
  state: accepted
---

# Status

**Accepted** (GH-061). Supersedes the package map in
[ADR-0016](0016-public-api-boundaries-freeze.md) by **adding** one package;
every frozen rule for the existing packages is unchanged.

# Context

GH-061 requires explicit, testable CSRF protection for state-changing
cookie-authenticated requests. ADR-0016 froze a six-package map that does
not include a security package; its own text states that boundary rule
changes require an ADR. The delivery plan (GH-061 suggested files,
`delivery/workstreams.md` "Forms/security" workstream) intended a dedicated
home for CSRF/cookie/CSP security primitives that does not bloat the HTTP
kernel (`@bundar/core`) or the validator adapter (`@bundar/schema`).

# Decision

Add `@bundar/security` with exactly one permitted import direction:

```text
@bundar/security  ← imports: @bundar/core (public surface only)
```

- It owns CSRF token issuance/verification, origin/`Sec-Fetch-Site`
  verification, and the unsafe-method middleware. Cookie/session and CSP
  concerns land here in later M4 issues (GH-062 interfaces remain in
  `@bundar/core` types where already frozen; GH-066 evaluates placement).
- It must not import `@bundar/jsx`, `@bundar/htmx`, `@bundar/schema`,
  `@bundar/testing`, or `@bundar/cli`; nothing imports it except
  applications and tests.
- `@bundar/core` and `@bundar/jsx` keep zero runtime dependencies
  (ADR-0011). The JSX hidden-input helper for CSRF (`GH-061`) lives in
  `@bundar/jsx/src/forms/` and takes the token as a plain prop — structural,
  no security import.
- `tools/architecture-check/boundaries.json` gains the rule; the GH-001
  skeleton test pins the new package with `allowsRuntimeDependencies: true`
  (workspace `@bundar/core` only).

# Consequences

- The map grows by one optional package: apps that do not use CSRF install
  nothing extra; core remains security-primitive-free.
- Boundary changes still require an ADR; this one adds a rule without
  weakening any existing edge.
