# Sessions guide

Bundar sessions attach through a narrow, storage-agnostic interface with
secure cookie defaults — and no built-in database coupling.

## The store contract

```ts
import { createMemorySessionStore, sessionMiddleware, getSession } from "@bundar/security";

app.use(sessionMiddleware({ store: myStore }));
```

`SessionStore` is three methods — `load(id)`, `commit(record)`,
`destroy(id)` — over opaque records. Attach Redis, PostgreSQL, or any durable
backend behind them; Bundar never queries storage directly.

> **Production requirement:** the bundled `createMemorySessionStore()` is for
> tests and single-process demos ONLY — it loses everything on restart, does
> not share across processes, and is explicitly unsuitable for production.
> Production deployments MUST provide a durable session store and manage its
> key material (rotation, access control, at-rest encryption) according to
> the store's own security documentation. Session cookies carry only an
> opaque 256-bit server-generated id; all state stays behind the store, so
> store compromise — not cookie theft — is the boundary that matters.

## Cookie policy (defaults)

`HttpOnly; SameSite=Lax; Path=/; Secure` with an `Expires` aligned to the
idle timeout and no `Domain` (host-only). `SameSite=Lax` is deliberate:
`Strict` breaks top-level login redirects, and strict cross-site protection
belongs to the CSRF middleware, which binds its tokens to this
session cookie. `Secure` can only be disabled explicitly for local
development.

## Lifecycle and security properties

- **Isolation**: unknown, expired, or malformed cookie ids get a brand-new
  empty session — authentication state can never leak across requests or be
  resurrected after expiry.
- **Rotation** (`session.rotate()`): issues a fresh id, preserves data, and
  destroys the old record on commit. Call it on login and every privilege
  change — this is the session-fixation policy. Rotation also invalidates
  outstanding CSRF tokens bound to the previous session value (fail closed).
- **Logout** (`session.destroy()`): invalidates the backing record AND clears
  the browser cookie; a stale cookie can never load anything.
- **Timeouts**: idle timeout (default 30 min) refreshes on activity, bounded
  by an absolute ceiling (default 12 h) inherited from the record — activity
  can never extend a session past its hard limit.

## Why no signed/encrypted cookie payloads

Reviewed and deemed unnecessary: all session state lives behind the
store, so the cookie has nothing to sign or encrypt — only an opaque id
generated from `crypto.getRandomValues`. If a stateless id scheme is ever
added, it requires a superseding review under the same acceptance criteria.


## Store contract and production posture

Every adapter implements the narrow port (`load`/`commit`/`destroy`) plus
security capabilities:

| Capability | Meaning | Required for production |
| --- | --- | --- |
| `durable` | survives restart, shared across processes | yes |
| `atomicRotate` | `rotate()` swaps ids indivisibly | **yes** (fixation defense) |
| `touch` | idle-expiry extension | yes |

- `rotate(oldId, record)` is ATOMIC: no dual-valid window across processes.
  Naïve create-new/delete-old sequences are rejected by
  `requireProductionSessionCapabilities`.
- Failures throw `SessionStoreError` with `kind: unavailable | conflict |
  serialization`; helpers must never silently mint anonymous sessions
  after a protected mutation.
- Serialization guard rejects functions, symbols, prototype-like keys,
  and prototype-bearing objects (recursively).
- Conformance suite: `packages/security/test/session-store-contract/` —
  durable adapters must pass it before use.
- In-memory store runs only with explicit `allowDegradedNonProduction`
  acknowledgment in production posture checks.


## Secure cookie policy

`resolveCookieSecure` derives `Secure` from the NORMALIZED origin
(ADR-0020): trusted https termination ⇒ `Secure`; production http origin
⇒ hard failure (never silent); development http requires explicit
`allowInsecureDevelopment`. `validateCookieAttributes` rejects
`SameSite=None` without `Secure` and enforces `__Host-` rules
(Secure + Path=/ + no Domain). Session middleware refuses production
construction with explicit `secure:false` and no proxy trust.


## Lifecycle security guarantees

- **Fixation**: authentication/privilege change ROTATES the id; an
  attacker-planted pre-auth cookie is never retained.
- **Rotation atomicity**: stores with `atomicRotate` use compare-and-swap
  `rotate()`; losing a concurrent race throws `conflict` so exactly ONE
  privileged session survives. Non-atomic stores fall back to
  destroy-then-commit (documented weaker path).
- **Logout**: destroy + epoch-clear cookie; stale-cookie replay yields a
  fresh anonymous session with NO inherited state.
- **Expiry**: expired ids are replaced with fresh anonymous cookies (epoch
  clear is reserved for logout).
- **CSRF rebinding**: tokens bind to the session id — rotation invalidates
  pre-rotation tokens for all post-rotation requests.
- Flash messages: single-consumption via `consumeFlash`.
