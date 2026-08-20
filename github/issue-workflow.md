---
type: GitHub Workflow
title: Issue Workflow and Dependency Practice
description: How to create, link, assign, execute, verify, and close the generated tasks in GitHub.
tags:
- github
- issues
- dependencies
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Creation

Create labels and milestones first. Create issues in topological order using stable IDs in titles. Keep `Depends on` and `Blocks` sections in issue bodies; after creation, replace stable references with links or GitHub sub-issue/dependency relationships where available.

# Ready definition

An issue is ready when all dependencies are merged, required decisions are accepted, inputs exist, and no upstream release gate blocks it.

# Done definition

Code and docs are merged, acceptance criteria are checked, exact verification commands and evidence are attached, deviations are resolved, and dependent issue metadata is updated.

# Reopening

Reopen when evidence was incorrect, a regression invalidates acceptance, or upstream behavior changes the contract. Do not create duplicate “fix follow-up” issues merely to preserve a misleading completed state.
