---
type: Engineering Specification
title: Continuous Integration Design
description: Required checks, version matrices, scheduled jobs, artifacts, caching, and branch protection.
tags:
- ci
- github-actions
- quality
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Pull-request checks

Format/lint, strict typecheck, unit/integration tests, type tests, architecture-boundary tests, OKF/link validation, security tests affected by the change, package build, and API snapshot diff.

# Matrix

- Bun minimum supported patch and current supported patch.
- htmx 2 pinned stable.
- htmx 4 pinned pre-release/GA in an experimental lane.
- Linux blocking; macOS and Windows according to milestone policy.
- Supported browser set for conformance jobs.

# Scheduled jobs

Bun canary compatibility, latest HTMX release detection, full browser matrix, benchmark trend, vulnerability scan, and stale-document/source check.

# Protection

Required checks cannot be bypassed by scripts that swallow exit codes. Release tags require a dedicated gated workflow and immutable artifacts.
