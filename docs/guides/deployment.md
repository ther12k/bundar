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

## Lifecycle (BR-057)

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

## Checklist

- [ ] `lifecycle.start()` before `Bun.serve()`
- [ ] `beginDrain` hook calls `server.stop(false)`
- [ ] Deadline sized to your slowest acceptable in-flight request
- [ ] Health/readiness route returns `lifecycle.ready`
