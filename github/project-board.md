---
type: GitHub Configuration
title: GitHub Project Board Design
description: Recommended project fields, views, automation, and dependency visibility.
tags:
- github-projects
- planning
- dependencies
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Fields

Stable ID, Status, Milestone, Priority, Area, Size, Depends On, Blocked By Upstream, Evidence Link, and Release Gate.

# Views

- Ready by milestone
- Blocked and upstream-dependent
- Security/P0
- HTMX 4 migration
- Release gate evidence
- Contributor-friendly tasks

# Automation

New planned issues start `Todo`; dependency completion does not automatically mark ready without validation. Pull requests move linked issues to `In Review`; merge may move to `Done` only when issue acceptance and evidence are satisfied.
