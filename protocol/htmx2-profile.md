---
type: Protocol Specification
title: HTMX 2 Stable Profile
description: Default Bundar protocol profile, tested behaviors, compatibility shims, and known constraints for htmx 2.
tags:
- htmx2
- stable
- profile
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
stale_after: '2026-09-21'
sources:
- id: htmx-2-docs
  resource: https://htmx.org/docs/
  title: htmx 2 documentation
  author: team:htmx
  last_modified: '2026-08-21'
---

# Baseline

The initial template targets the latest pinned htmx 2.x patch verified in CI; the source snapshot observed `2.0.10` on August 21, 2026. The exact supported version is release metadata, not a floating documentation promise.

# Profile behavior

- Parse `HX-Request`, `HX-Boosted`, `HX-Current-URL`, `HX-History-Restore-Request`, `HX-Target`, `HX-Trigger`, `HX-Trigger-Name`, and `HX-Prompt` when present.
- Infer partial/full representation because `HX-Request-Type` is unavailable.
- Configure or bridge validation/error response handling so `c.action` behavior matches the normalized contract.
- Render update intents with htmx 2 OOB behavior or documented extensions.
- Map Bundar lifecycle event names to htmx 2 event strings.

# Constraints

htmx 2’s implicit inheritance and history cache are not used as Bundar portability defaults. Applications may opt in, but the audit tool marks those assumptions for review.
