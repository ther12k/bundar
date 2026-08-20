---
type: Engineering Standard
title: HTMX Dialect Conformance Suite
description: Fixture format, browser matrix, behavioral assertions, source pinning, and evidence for protocol compatibility.
tags:
- conformance
- browser-tests
- htmx
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Fixture layers

1. Header parser fixtures: raw `Headers` to normalized metadata.
2. Response serializer fixtures: directives to exact headers.
3. Rendering fixtures: common intents to dialect-specific attributes/update markup.
4. Browser fixtures: actual pinned htmx asset executing against a Bundar test server.
5. Reference-app journeys: behavior-level equivalence.

# Minimum journeys

Full navigation, boosted link, targeted GET, create/update/delete form, 422 validation, 401/403/404/500 fragment errors, push/replace history, back/forward restore, event triggers, multi-region updates, polling, abort/sync, focus preservation, and JavaScript-disabled fallback.

# Matrix

Run current supported browsers on Linux CI at minimum, with scheduled broader browser and OS runs. Pin exact htmx versions and asset hashes. A moving CDN URL is not valid evidence.

# Evidence

Store test command, Bun version, htmx version, browser versions, fixture commit, screenshots or traces for failures, and machine-readable results. Upstream pre-release changes trigger a fresh run before the compatibility matrix is edited.
