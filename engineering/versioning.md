---
type: Engineering Standard
title: Versioning, Deprecation, and Compatibility Policy
description: Framework semver, pre-1.0 changes, runtime/HTMX profiles, deprecation windows, and experimental APIs.
tags:
- semver
- deprecation
- compatibility
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Framework versions

Use semantic versioning. Before 1.0, minor versions may contain breaking changes but require migration notes and explicit release labels. Patch releases must not intentionally break documented stable APIs.

# External profiles

Every release states exact tested Bun and HTMX versions plus supported ranges. A new upstream major never becomes supported by inference.

# Experimental APIs

Experimental exports are clearly marked and may change more quickly. The htmx 4 adapter remains experimental until M7.

# Deprecation

After 1.0, deprecate before removal where technically feasible, provide runtime/type diagnostics, document replacements, and retain for at least one minor line unless security requires faster action.
