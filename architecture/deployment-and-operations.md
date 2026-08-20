---
type: Architecture Specification
title: Deployment and Operations
description: Supported deployment shape, configuration, health, shutdown, proxies, containers, and operational evidence.
tags:
- deployment
- operations
- containers
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
sources:
- id: bun-1-4
  resource: https://bun.com/blog/bun-v1.4
  title: Bun 1.4 release notes
  author: team:bun
  last_modified: '2026-08-20'
---

# Supported shape

A Bundar application is a Bun process that exports or invokes compiled `Bun.serve` options. It may run directly, in a container, behind a reverse proxy, or on a platform that supports Bun.

# Required operational concerns

- Environment/config validation before listen.
- Separate liveness and readiness behavior where dependencies require it.
- Graceful shutdown that stops accepting work, drains bounded requests, and closes resources.
- Explicit trusted-proxy configuration before using forwarded headers.
- Structured stdout/stderr logs or an installed adapter.
- Resource limits and body/upload limits.
- Immutable build metadata and rollback instructions.

# Framework responsibility

Provide hooks and examples, not a hosting control plane. HTTP/3 and other experimental Bun features remain opt-in and cannot be required by the initial release.
