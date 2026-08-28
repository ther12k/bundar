# Security guide

Bundar's security model in the main path: sessions establish identity,
CSRF binds tokens to it, validation runs identically for every browser
mode, errors never leak internals, and headers fail closed. Nothing
here is an appendix — the reference apps run this composition in their
primary flows.

> Deep-dives: [sessions](sessions.md) · [uploads](uploads.md) ·
> [validation](validation.md). The executable sources:
> [`examples/workflow-gate`](https://github.com/ther12k/bundar/blob/main/examples/workflow-gate/workflow.ts)
> (the reference composition) and
> [`examples/admin-crud`](https://github.com/ther12k/bundar/blob/main/examples/admin-crud/src/security.test.ts)
> (the posture suite).

## The composition contract

```text
sessionMiddleware (global, durable store in production)
  └─ action group: csrfMiddleware (unsafe routes ONLY)
       └─ handlers: runFormAction / actionResponse / errorViewResponse
pages: issue session-bound synchronizer tokens (hidden field + cookie)
```

Three rules make the synchronizer flow work — each is tested:

1. **Page renderers issue tokens bound to `session.id`** (both the
   `bundar.csrf` cookie and the hidden field). A token issued before the
   first session cookie exists would bind to the anonymous binding and
   fail verification forever — which is why CSRF verification is scoped
   to unsafe routes and pages own issuance.
2. **Verification enforces three-way agreement**: origin evidence,
   cookie token, submitted token — the last two must verify against the
   session binding AND match each other. Missing/cross-origin/tampered/
   foreign-session tokens all fail closed with a generic 403 (the
   reason stays server-side).
3. **Rotation follows state**: success rotates the token (the next form
   render carries the fresh one); a 422 re-render rotates nothing, so
   the retry verifies without a re-fetch.

## Sessions

`sessionMiddleware` attaches a narrow `SessionStore` (load/commit/
destroy) behind an opaque cookie carrying only a canonical 256-bit id.
Rotation kills old ids (fixation defense); destruction clears the
cookie. **The bundled memory store is for tests and single-process
demos only** — production needs a durable store behind the same
interface (see the [sessions guide](sessions.md)).

## Validation and redaction

`runFormAction` parses with bounded limits, validates through any
Standard Schema, and re-renders with the standard field-error model —
which retains safe values only: sensitive keys (passwords, tokens,
secrets) and upload contents never round-trip into HTML. Invalid
submissions answer 422 in BOTH worlds with the same messages.

## Errors that never leak

- Expected failures (`HttpError`, CSRF 403, 404, 409, 422) keep their
  public envelope — status + safe message, nothing else.
- Unexpected failures become opaque 500s in production; messages and
  stacks appear only in development.
- Authorization failures (401/403) render generic documents without
  protected content even for enhanced requests — and
  authorization reads ONLY the session. HTMX headers never grant
  identity: the [admin posture suite](../examples/admin.md) proves a
  viewer claiming an admin trigger still gets 403, and record identity
  comes from route params, never `hx-target`.

## Headers and CSP

`securityHeaders()` applies the frozen mandatory baseline per request:
nonce-based CSP (crypto-random, request-scoped), `X-Content-Type-Options:
nosniff`, `Referrer-Policy`, `Permissions-Policy`, `COOP`, HSTS on
secure deployments. Handler CSP additions append to — never replace —
the mandatory policy. Known interaction: htmx injects an inline
`<style>` for indicators at runtime; production apps disable
`includeIndicatorStyles` or use the development profile (documented in
the header tests).

## Uploads

`handleUploads` enforces a declared policy: allowed MIME types, size
ceilings, sanitized client filenames, temp files outside web roots,
and guaranteed cleanup. Undeclared fields fail closed. See the
[uploads guide](uploads.md).

## Testing the posture

`@bundar/testing` builds real browser semantics in-process — origin
headers on unsafe submissions, cookie jars, enhanced/no-JS lanes:

```bash
bun run security:example-admin   # the admin posture suite
bun run test:example -- todo:no-js
```

The security battery in CI also runs the nine fail-closed audits
(`bun run test:security`) and the posture report
(`bun run security:report`).
