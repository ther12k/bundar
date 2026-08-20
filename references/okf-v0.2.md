---
type: Reference
title: Open Knowledge Format v0.2 Bundle Conventions
description: Local summary of the OKF structure used by this archive.
tags:
- okf
- format
- reference
status: stable
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

# Applied conventions

- Bundle-root `index.md` declares `okf_version: "0.2"`.
- Reserved `index.md` and `log.md` files are not concept documents and have no frontmatter except the root version declaration.
- Every other Markdown file has parseable YAML frontmatter and a non-empty `type`.
- `status: draft` means design is unreviewed; `stable` is used only for preserved reference notes, not implementation proof.
- `generated` records the producing model and time; no `verified` actor is fabricated.
- Links are bundle-relative or ordinary relative Markdown links.
- Custom issue metadata is permitted as producer-defined frontmatter.
