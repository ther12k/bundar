---
type: Architecture Specification
title: Assets, HTMX Delivery, and Build Integration
description: Local asset serving, version pinning, integrity, static directories, production builds, and dev behavior.
tags:
- assets
- build
- htmx
- static
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

# Default HTMX delivery

Applications install an explicit `htmx.org` version. Bundar resolves the selected distribution during development/build, fingerprints it, and serves it locally through a native Bun static or file route. The adapter emits the matching script element.

# Modes

- `local` — default; pinned lockfile dependency, content hash, same-origin asset.
- `cdn` — explicit URL, exact version, SRI, and crossorigin policy.
- `external` — application supplies tags and assumes compatibility responsibility.

# Static directories

Bundar exposes a thin configuration that compiles to Bun 1.4 directory routes rather than implementing static middleware.

# Build output

A production build records framework version, Bun version, selected HTMX version/dialect, asset hashes, route manifest hash, and source commit when available. Sourcemap exposure follows explicit environment policy.

# Development

Use Bun’s watch/hot facilities. Framework state must rebuild cleanly without accumulating routes or middleware across reloads.
