---
type: Open Source Strategy
title: Open-Source and Ecosystem Strategy
description: Licensing recommendation, governance, contribution model, extension boundaries, and project sustainability.
tags:
- open-source
- governance
- ecosystem
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# License recommendation

Use the MIT License for framework code unless legal review identifies a reason to choose another permissive license. Documentation may use the repository license or a clearly documented Creative Commons license; do not mix policies accidentally.

# Governance model

- Maintainer-led during pre-1.0 development.
- Public ADRs for architecture and compatibility decisions.
- Small issue-scoped pull requests with evidence.
- Security reports handled privately under a published policy.
- A contributor ladder may be introduced only after actual community participation exists.

# Ecosystem boundary

Core owns routing compilation, context, middleware, errors, and response primitives. JSX owns HTML rendering. HTMX owns the dialect boundary. Validation, sessions, styling, data access, authentication providers, and component libraries remain optional.

# Stability promise

Pre-1.0 releases may change APIs, but changes require migration notes and type snapshots. After 1.0, use semantic versioning, documented deprecations, and compatibility tests.

# Sustainability

Prefer a small maintenance surface, automated conformance, and transparent release cadence over constant feature expansion. Sponsorship or commercial support may be added later without placing core functionality behind a proprietary gate.
