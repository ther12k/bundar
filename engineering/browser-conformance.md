---
type: Engineering Standard
title: Browser and HTMX Conformance Engineering
description: Server fixture design, pinned browser/HTMX matrices, trace capture, and cross-dialect equivalence rules.
tags:
- browser
- conformance
- playwright
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Harness

Use a real browser automation dependency in development, a real Bundar server on an ephemeral port, and exact local HTMX assets. Tests must not mock DOM swapping when claiming protocol conformance.

# Equivalence

Assertions focus on user-visible DOM, focus, URL/history, event payloads, network method/status, and fallback navigation. Adapter-owned markup may differ; application source and outcomes must not.

# Failure artifacts

Capture trace, screenshot, browser console, server logs, request/response headers, HTMX version/hash, and test seed. Retain artifacts for failed CI runs.

# GH-008 baseline

The GH-008 local harness uses one shared fixture source with exact local htmx
assets, a Bun ephemeral-port server, and Playwright CLI sessions for the stable
htmx `2.0.10` lane and experimental htmx `4.0.0-beta6` lane. It records DOM,
history, request, console, screenshot, and trace/network artifacts. A deliberate
missing-header fixture must exit nonzero. Beta observations are reported
separately and cannot establish htmx 4 GA compatibility.
