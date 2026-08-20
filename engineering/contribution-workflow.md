---
type: Engineering Standard
title: Contribution and Pull-Request Workflow
description: Issue selection, branch scope, commit expectations, review evidence, documentation updates, and merge policy.
tags:
- contributing
- pull-request
- workflow
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Workflow

1. Select a ready issue whose dependencies are complete.
2. Comment with intended approach when the issue is non-trivial.
3. Implement one coherent scope.
4. Run issue verification plus affected global checks.
5. Update API docs, OKF concepts, compatibility matrix, or examples as required.
6. Open a PR linking the stable issue ID and GitHub issue.
7. Attach evidence and note deviations.

# Merge policy

Squash or merge policy is a repository decision, but commit/PR messages must retain the stable issue ID. Required gates pass without ignored failures. Reviewers check behavior, not only style.
