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

# Registry publication (pre-1.0) — ADR-0021

All nine public packages version in synchronized lockstep. The first
registry version is `0.1.0-alpha.2` (continuing the GitHub source-only
`v0.1.0-alpha.1` line), dist-tag `alpha`. `latest` stays EMPTY until the
stable `0.1.0`; `next` is reserved and empty. In-repo manifests remain
`0.0.0` + `private: true`; the publication pipeline flips version and
privacy together for all packages at once, on the tag. Internal edges are
`workspace:*` in-repo and `^<line>` caret ranges when packed. The
experimental htmx 4 pin must keep its prerelease hyphen while M7 is open;
`bun run release:plan` fails on any violation. Full policy and
enforcement list: `decisions/0021-package-versioning-and-publication.md`.
