---
type: Compatibility Matrix
title: HTMX 2 and HTMX 4 Compatibility Matrix
description: Feature-level mapping, portability classification, and Bundar handling strategy across HTMX major versions.
tags:
- matrix
- htmx2
- htmx4
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
stale_after: '2026-09-01'
sources:
- id: htmx-2-docs
  resource: https://htmx.org/docs/
  title: htmx 2 documentation
  author: team:htmx
  last_modified: '2026-08-21'
- id: htmx-4-docs
  resource: https://four.htmx.org/docs
  title: htmx 4 beta documentation
  author: team:htmx
  last_modified: '2026-08-21'
- id: htmx-2-compat
  resource: https://four.htmx.org/extensions/htmx-2-compat
  title: Official htmx 2 compatibility extension for htmx 4
  author: team:htmx
  last_modified: '2026-08-21'
---

# Matrix

| Concern | htmx 2 | htmx 4 beta profile | Bundar strategy |
|---|---|---|---|
| Core request attributes | Present | Mostly retained | Typed common subset |
| Request marker | `HX-Request` | `HX-Request` | Normalize directly |
| Request representation | Inferred | `HX-Request-Type` | Adapter returns `partial/full/unknown` |
| Source header | `HX-Trigger` + name | `HX-Source` | Normalize element reference; name optional |
| Target header format | ID | `tag#id` form | Parse to structured reference |
| Attribute inheritance | Implicit by default | Explicit by default | Avoid raw inheritance; use helper |
| History cache | Local cache by default | Network restoration by default | Representation algorithm and Vary owned by adapter |
| Lifecycle events | Legacy names | phase/system names | Bundar event enum mapping |
| Custom extensions | callback API and `hx-ext` | hook API, script activation | Version-specific extension adapter |
| Error responses | many 4xx/5xx not swapped | swapped except exclusions | Action/error compatibility policy |
| Multi-region updates | OOB swaps | OOB plus partial constructs | Normalized update intents |
| Official compatibility aid | n/a | `htmx-2-compat` extension | Optional migration diagnostic, not permanent architecture |

# Interpretation

“Supported” means a pinned version passes Bundar conformance fixtures. It does not mean every upstream feature receives a cross-major guarantee. The stable subset is narrower than either upstream API.

## GH-008 browser evidence

The GH-008 fixture currently records htmx `2.0.10` as the stable lane and htmx
`4.0.0-beta6` as an experimental lane. The shared browser source passes smoke,
fragment, form, and history scenarios in both lanes. The stable lane observes
`htmx:afterRequest`; the beta lane currently observes no matching legacy event.
That difference is retained as adapter work and is not an htmx 4 GA compatibility
claim. Exact asset hashes and run artifacts are recorded in
`evidence/gh-008/report.json`.
