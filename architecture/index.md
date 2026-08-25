---
title: Architecture Corpus Index
description: Link index of the OKF architecture design corpus; implementation status lives in README.md and delivery/gates.
tags:
- bundar
status: stable
---

# Architecture

- [Assets, HTMX Delivery, and Build Integration](assets-and-build.md) — Local asset serving, version pinning, integrity, static directories, production builds, and dev behavior.
- [Context, Services, Variables, Guards, and Middleware](context-and-middleware.md) — Request context shape, typed environment, middleware composition, authorization guards, and mutation boundaries.
- [Deployment and Operations](deployment-and-operations.md) — Supported deployment shape, configuration, health, shutdown, proxies, containers, and operational evidence.
- [Errors, Status Semantics, and Recovery](error-model.md) — Typed HTTP errors, validation failures, application exceptions, HTMX error fragments, and committed-stream failures.
- [Extension and Plugin Model](extensions.md) — Composition rules for optional packages without runtime discovery, hidden scopes, or core dependency inversion.
- [Forms, Parsing, Validation, and Error Rendering](forms-and-validation.md) — HTML-form-first input handling, Standard Schema adapters, field errors, multipart limits, and progressive response behavior.
- [HTMX Protocol Boundary and Dialect Isolation](htmx-boundary.md) — How Bundar contains HTMX major-version differences and protects application code from protocol churn.
- [Server-Only JSX Runtime](jsx-runtime.md) — JSX node model, escaping, attributes, components, async rendering, raw HTML, and prohibited client-runtime behavior.
- [Native Bun Routing and Route Compilation](native-routing.md) — Route registration API, path grammar, conflict detection, native compilation, type extraction, and fallthrough behavior.
- [Observability and Diagnostic Context](observability.md) — Structured logs, metrics, traces, route identity, dialect data, error records, and zero-dependency hooks.
- [Page, Fragment, and Action Response Model](page-fragment-actions.md) — First-class representation negotiation and mutation responses for ordinary browsers and htmx clients.
- [Document, Layout, Fragment, and Streaming Rendering](rendering-model.md) — How layouts, document assets, fragments, async boundaries, headers, and streams compose.
- [Request Lifecycle and Execution Plan](request-lifecycle.md) — Deterministic request phases, lazy work, sync fast paths, abort behavior, and response ownership.
- [Bundar Security Architecture](security.md) — Threat boundaries and secure defaults for rendering, requests, forms, cookies, assets, uploads, errors, and deployment.
- [Streaming, SSE, WebSockets, and Incremental Hypermedia](streaming-and-realtime.md) — Initial streaming support and boundaries for later SSE, WebSocket, multipart, and htmx 4 partial capabilities.
- [Bundar System Overview](system-overview.md) — Top-level components, compile path, request path, dependency direction, and framework boundaries.
