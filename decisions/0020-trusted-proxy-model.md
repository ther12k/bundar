---
type: Architecture Decision
title: ADR-0020 — Trusted Proxy Client Model
description: Fail-closed client identity for direct deployments and explicitly trusted reverse proxies - peer-first addressing, rightmost-untrusted hop walking, malformed-input rejection, and one normalized origin contract.
tags:
- adr
- architecture-decision
- security
- proxies
status: accepted
updated: '2026-08-23'
decision:
  id: ADR-0020
  state: accepted
---

# Status

**Accepted** — M8.4 production hardening (BR-059).

# Context

Cookie security attributes, absolute redirects, CSRF/origin checks, audit
logging, and future rate limiting all need ONE answer to "who is the client
and what origin did this request really use?" Implicitly trusting
`Forwarded` / `X-Forwarded-*` headers lets clients spoof identity; ignoring
them unpredictably breaks every reverse-proxy deployment.

# Decision

## 1. Fail-closed default

With NO trust configuration, forwarded metadata is IGNORED ENTIRELY:

- `Forwarded` — ignored
- `X-Forwarded-For` — ignored
- `X-Forwarded-Proto` — ignored
- `X-Forwarded-Host` — ignored

Client address = transport peer. Scheme/host come from the connection as
the runtime reports them.

## 2. Explicit, bounded trust

Trust is opt-in via `ProxyTrustConfig`:

| Field | Meaning | Default |
| --- | --- | --- |
| `proxies` | Exact IPs or IPv4 CIDRs; IPv4-mapped IPv6 normalized | required, non-empty |
| `maxHops` | Forwarded hops processed | 1 (hard cap 32) |

The immediate transport peer MUST match the allowlist; otherwise forwarded
data came from an untrusted source and is discarded entirely (fail closed).

## 3. Hop algorithm (rightmost-untrusted)

Walk `X-Forwarded-For` RIGHT to LEFT: skip entries matching trusted proxies
(up to `maxHops`); return the FIRST untrusted entry as the client. Any
malformed or empty entry anywhere in the chain fails closed to the raw
peer with `forwardedTrusted: false`. Duplicate headers are treated as one
comma-joined list per Fetch semantics.

## 4. Canonical scheme/host

Scheme resolution order when forwarded data is trusted: RFC 7239 `proto=`,
else `X-Forwarded-Proto`; values restricted to `http`/`https` (anything
else → `unknown`). DOWNGRADE GUARD: an https transport connection to the
trusted peer can never be downgraded by a claimed http value. Host: first `X-Forwarded-Host` entry, else the request
URL host. Consumers (cookies BR-060, origin checks BR-062, redirects,
audit) MUST consume this single resolved contract — never parse forwarded
headers independently.

## 5. Development vs production defaults

Development (`secure: false`, no proxies): direct peer, http allowed.
Production posture (BR-060/BR-062): secure cookies REQUIRE either a
direct-https connection or a trusted-proxy resolution yielding
`https`.

# Consequences

Deployment examples live in [the deployment guide](../docs/guides/deployment.md).
Contract tests pin every rule in
`packages/security/test/proxy-contract.test.ts`.
