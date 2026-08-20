---
type: Engineering Standard
title: OKF Documentation Governance
description: Source-of-truth order, document lifecycle, freshness, linking, validation, and implementation updates.
tags:
- okf
- documentation
- governance
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
sources:
- id: okf-spec
  resource: https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md
  title: Open Knowledge Format v0.2 Specification
  author: team:google-cloud-knowledge-catalog
  last_modified: '2026-08-21'
---

# Repository source-of-truth order

1. Executed tests and code for implemented behavior.
2. Accepted ADRs and versioned protocol contracts.
3. Current OKF architecture/product documents.
4. README and examples.

# Rules

- Every non-reserved Markdown concept has parseable frontmatter and a non-empty `type`.
- Root `index.md` declares `okf_version: "0.2"`; reserved indexes/logs follow OKF rules.
- External current-version notes carry source dates and `stale_after` when appropriate.
- Draft design is not marked stable or verified automatically.
- Code-changing PRs update affected concepts in the same PR.
- Internal links and issue dependency references validate in CI.
- Generated bundle reports describe local structural checks, not external certification.
