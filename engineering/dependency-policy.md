---
type: Engineering Standard
title: Dependency and Supply-Chain Policy
description: Runtime-dependency budgets, development dependencies, pinning, provenance, licenses, and update workflow.
tags:
- dependencies
- supply-chain
- licenses
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Runtime policy

`@bundar/core` and `@bundar/jsx` start with zero runtime dependencies. Other packages minimize dependencies and document why each is needed.

# HTMX

`htmx.org` is an explicit application dependency or peer relationship; Bundar records and serves the installed exact asset rather than bundling an invisible floating copy.

# Development tooling

Development dependencies are allowed for testing, browser automation, documentation, and API analysis. Pin through `bun.lock`, audit updates, and avoid duplicate toolchains without reason.

# Release controls

Generate SBOM, check licenses, verify package contents, publish provenance where supported, and test installation in a clean project with network access disabled after package acquisition.
