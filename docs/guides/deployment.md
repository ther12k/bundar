---
type: Guide
title: Deployment and Lifecycle
description: Running Bundar in production - lifecycle resources, readiness, graceful shutdown with bounded drain, and process signal wiring.
tags:
- guide
- deployment
- lifecycle
status: stable
updated: '2026-08-23'
---

# Deployment and lifecycle

## Lifecycle

Register resources in dependency order; `Lifecycle` guarantees deterministic
startup, rollback on failure, bounded draining, and idempotent stop.

```ts
import { Lifecycle } from "@bundar/core";

const lifecycle = new Lifecycle({ shutdownDeadlineMs: 10_000 });

lifecycle.register({
  name: "database",
  start: () => db.open(),
  stop: () => db.close(),
});

await lifecycle.start();
// lifecycle.ready === false during startup; true only after all resources

const server = Bun.serve({
  ...app.compile(),
  port,
});
```

## Graceful stop

Wire signals through the injectable registrar so tests never send real
signals:

```ts
lifecycle.attachSignals(); // SIGINT/SIGTERM -> lifecycle.stop()

// stop(): beginDrain hook -> server stops accepting; in-flight work gets a
// bounded window; abortRemaining fires if the deadline expires.
```

Track request work with `lifecycle.beginWork()` / the returned release
function inside middleware or route handlers when you need drain to wait
for real completion.

## Startup failure semantics

If any resource fails to start, already-started resources are stopped in
reverse order before `LifecycleStartError` propagates — no half-open
databases or queues.

## Cancellation

Every request exposes one standard signal: `context.signal` (transport
disconnect + budget deadline + forced shutdown, first cause wins).

- Graceful stop does NOT cancel in-flight requests; only drain-deadline
  expiry, a second forced stop, or an explicit abort does.
- Pass `context.signal` into downstream work that accepts signals
  (`generateReport({ signal })`, `renderToStream(node, { signal })`).
- `context.signal.throwIfAborted()` at orchestration boundaries.

**Cancellation is not transaction rollback.** Abort BEFORE a business
commit may stop the operation; abort AFTER commit leaves the mutation
committed and only cancels response delivery. Retry/idempotency remains
an application contract.

## Reverse proxies (ADR-0020)

Forwarded headers are IGNORED unless you explicitly trust your proxy:

```ts
import { resolveClient } from "@bundar/security";
import type { ProxyTrustConfig } from "@bundar/security";

const trust: ProxyTrustConfig = {
  proxies: ["10.0.0.5"], // your nginx/caddy/traefik IP or CIDR
  maxHops: 1,
};

app.get("/", (context) => {
  // peer comes from the server runtime; see lifecycle wiring
  const client = resolveClient(context.request, peerAddress, trust);
  // one normalized identity for cookies, origin checks, audit logs
});
```

Common patterns:

| Deployment | Config |
| --- | --- |
| Direct (no proxy) | omit `trust` — forwarded headers ignored entirely |
| Single local reverse proxy | `proxies: ["127.0.0.1"]` |
| Docker/private network | `proxies: ["10.0.0.0/8"]`, `maxHops: 2` |

Never enable trust based on platform auto-detection; allowlist explicit
addresses only.

## Checklist

- [ ] `lifecycle.start()` before `Bun.serve()`
- [ ] `beginDrain` hook calls `server.stop(false)`
- [ ] Deadline sized to your slowest acceptable in-flight request
- [ ] Health/readiness route returns `lifecycle.ready`
