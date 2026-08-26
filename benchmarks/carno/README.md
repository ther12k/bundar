# benchmarks/carno

Carno.js (`@carno.js/core` `1.7.0`, MIT) on Bun is the enterprise-model
reference for BR-076: NestJS-style controllers, constructor dependency
injection, lifecycle hooks, and zod-backed body validation, compiled to
Bun-native routes. The pinned fixture lives in
`tools/benchmark/carno-app.ts`; parity against raw Bun is asserted before
timing, exactly like the Hono fixture.

The fixture boots through Carno's public lifecycle — `listen(0)` then
`stop()` — so the DI container is constructed and controllers are
JIT-compiled exactly as in production. Requests then dispatch in-process
over the compiled route table (the same methodology the Bundar adapter
uses: a table lookup stands in for Bun.serve's native C++ dispatch).

## Documented semantic differences

- **Implicit response normalization.** Handlers returning plain strings
  become one pre-built static `Response` with `text/plain`; objects
  become `application/json`. The parity contract for these scenarios
  requires exact `text/html; charset=utf-8` /
  `text/plain; charset=utf-8` content types, so fixture handlers
  construct `Response` objects explicitly — the same primitive the
  raw-Bun adapter uses. Consequence: Carno's pre-built static fast path
  cannot produce parity-faithful HTML and is not exercised by the
  `static-response` scenario.
- **DI/controller construction.** `@Service` classes resolve once at
  bootstrap; per-request service access is a property read on the
  controller instance. The startup probe prices Carno's bootstrap
  (container + JIT compilation) separately.
- **Validation error shape.** Validation failures throw
  `ValidationException`, which Carno's global error handler normalizes
  to JSON. The `validated-json` scenario therefore times the valid path,
  where every adapter produces byte-equal responses; error-path shapes
  are framework-opinionated and excluded from parity by design.
- **JSX/HTMX exclusion.** The two JSX rendering scenarios exclude the
  Carno adapter: a string concatenation would not be equivalent work to
  Bundar's `renderNode` escaping model, so no direct comparison — and no
  winner label — is printed for them.

This baseline is a comparator, not a Bundar performance claim, and it
must not become a Bundar runtime dependency: `@carno.js/core` is pinned
as a root dev dependency only (asserted by
`tests/benchmark/benchmark.test.ts`).
