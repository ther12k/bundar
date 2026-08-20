---
type: Architecture Specification
title: Observability and Diagnostic Context
description: Structured logs, metrics, traces, route identity, dialect data, error records, and zero-dependency hooks.
tags:
- observability
- logging
- metrics
- tracing
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Core hooks

Core exposes lifecycle events or callbacks with typed diagnostic records; it does not require an observability SDK.

Minimum request fields:

- request ID and optional trace context;
- stable route ID and method;
- status, duration, bytes when known;
- HTMX dialect and request representation;
- error code/class without sensitive payloads;
- abort and stream-commit state.

# Adapters

Optional packages may bridge to OpenTelemetry or logging libraries. Telemetry failures must not fail business requests.

# Diagnostics

Development diagnostics explain route conflicts, middleware registration, invalid responses, unsafe raw HTML usage locations when available, adapter mismatches, and migration-audit findings.
