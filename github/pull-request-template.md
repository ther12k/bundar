---
type: GitHub Template
title: Pull Request Template
description: PR checklist for scope, behavior, tests, evidence, compatibility, security, performance, and documentation.
tags:
- github
- pull-request
- template
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Template

```markdown
## Issue
Closes GH-NNN / #number

## Change
What changed and why.

## Contract impact
Public API, route behavior, JSX output, HTMX dialects, security, performance, or none.

## Verification
Exact commands and summarized results.

## Evidence
Logs, traces, screenshots, benchmark files, API diff, or package artifact.

## Checklist
- [ ] Scope matches one issue
- [ ] Tests added/updated
- [ ] Both relevant HTMX dialects considered
- [ ] No-JS fallback considered
- [ ] Security boundary reviewed
- [ ] Performance impact measured when relevant
- [ ] OKF/docs updated
- [ ] No test failure hidden
```
