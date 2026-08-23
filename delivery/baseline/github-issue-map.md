---
type: Issue Map
title: Post-Alpha GitHub Issue Map
description: Stable BR-NNN identifiers mapped to GitHub issues after the BR-001 baseline rebase.
tags: [m8, github, issues]
status: stable
updated: '2026-08-23'
---

# Post-alpha GitHub issue map

Created from the verified review bundle via its bulk-creation runbook.

| ID | Title | Issue | Status |
| --- | --- | --- | --- |
| BR-001 | Freeze the post-alpha audit baseline and provenance | — | closed on main (commit history + delivery/ evidence) |
| BR-002 | Add a regression probe for middleware composition count | — | closed on main (commit history + delivery/ evidence) |
| BR-003 | Move middleware composition fully into the compile phase | — | closed on main (commit history + delivery/ evidence) |
| BR-004 | Guard middleware hot-path allocations with a release budget | — | closed on main (commit history + delivery/ evidence) |
| BR-005 | Reproduce and threat-model raw HTML brand forgery | — | closed on main (commit history + delivery/ evidence) |
| BR-006 | Make the raw HTML trust marker non-accidentally forgeable | — | closed on main (commit history + delivery/ evidence) |
| BR-007 | Audit every renderer, header, and HTMX unsafe sink | — | closed on main (commit history + delivery/ evidence) |
| BR-008 | Replace the stale design-bundle root README | — | closed on main (commit history + delivery/ evidence) |
| BR-009 | Generate README status facts and fail on drift | — | closed on main (commit history + delivery/ evidence) |
| BR-010 | Reconcile stale milestone and release claims across the corpus | — | closed on main (commit history + delivery/ evidence) |
| BR-011 | Decide and freeze the post-alpha package dependency graph | — | closed on main (commit history + delivery/ evidence) |
| BR-012 | Enforce the package dependency graph in CI | — | closed on main (commit history + delivery/ evidence) |
| BR-013 | Create the `@bundar/forms` package skeleton | — | closed on main (commit history + delivery/ evidence) |
| BR-014 | Extract framework-neutral form action contracts | — | closed on main (commit history + delivery/ evidence) |
| BR-015 | Move progressive form orchestration into `@bundar/forms` | — | closed on main (commit history + delivery/ evidence) |
| BR-016 | Isolate Standard Schema integration behind a forms adapter | — | closed on main (commit history + delivery/ evidence) |
| BR-017 | Make `@bundar/htmx` protocol-pure | — | closed on main (commit history + delivery/ evidence) |
| BR-018 | Provide compatibility re-exports for moved form APIs | — | closed on main (commit history + delivery/ evidence) |
| BR-019 | Add packed external type consumers for every public export map | — | closed on main (commit history + delivery/ evidence) |
| BR-020 | Regenerate package API docs, diagrams, and migration guidance | — | closed on main (commit history + delivery/ evidence) |
| BR-021 | Adopt a feature-sliced application structure for agent-friendly Bundar | — | closed on main (commit history + delivery/ evidence) |
| BR-022 | Define application import direction and agent read/write zones | — | closed on main (commit history + delivery/ evidence) |
| BR-023 | Implement an application feature-boundary checker | — | closed on main (commit history + delivery/ evidence) |
| BR-024 | Create the canonical feature-slice scaffold tree | — | closed on main (commit history + delivery/ evidence) |
| BR-025 | Expose `create-bundar --structure feature` | — | closed on main (commit history + delivery/ evidence) |
| BR-026 | Convert the canonical minimal starter UI to actual TSX | — | closed on main (commit history + delivery/ evidence) |
| BR-027 | Extract the minimal starter validation schema | — | closed on main (commit history + delivery/ evidence) |
| BR-028 | Extract the minimal starter views and components | — | closed on main (commit history + delivery/ evidence) |
| BR-029 | Extract the minimal starter action and service boundary | — | closed on main (commit history + delivery/ evidence) |
| BR-030 | Reduce the minimal route module to HTTP and hypermedia orchestration | — | closed on main (commit history + delivery/ evidence) |
| BR-031 | Document and gate the minimal starter architecture | — | closed on main (commit history + delivery/ evidence) |
| BR-032 | Create the Todo feature-slice skeleton and migration map | — | closed on main (commit history + delivery/ evidence) |
| BR-033 | Move Todo domain types and repository ports | — | closed on main (commit history + delivery/ evidence) |
| BR-034 | Extract Todo schemas and application actions | — | closed on main (commit history + delivery/ evidence) |
| BR-035 | Extract Todo pages, fragments, forms, and components | — | closed on main (commit history + delivery/ evidence) |
| BR-036 | Extract Todo route registration and bootstrap composition | — | closed on main (commit history + delivery/ evidence) |
| BR-037 | Close Todo feature-slice regression and source-diff evidence | — | closed on main (commit history + delivery/ evidence) |
| BR-038 | Inventory and scaffold Admin reference features | — | closed on main (commit history + delivery/ evidence) |
| BR-039 | Split Admin domain models and repository ports | — | closed on main (commit history + delivery/ evidence) |
| BR-040 | Extract Admin validation, authorization, and application actions | — | closed on main (commit history + delivery/ evidence) |
| BR-041 | Extract Admin pages, tables, forms, dialogs, and update regions | — | closed on main (commit history + delivery/ evidence) |
| BR-042 | Extract Admin route modules and runtime bootstrap | — | closed on main (commit history + delivery/ evidence) |
| BR-043 | Close Admin feature-slice regression and architecture evidence | — | closed on main (commit history + delivery/ evidence) |
| BR-044 | Add concise local `AGENTS.md` and feature-map templates | — | closed on main (commit history + delivery/ evidence) |
| BR-045 | Introduce file-size and responsibility budgets with explicit exceptions | — | closed on main (commit history + delivery/ evidence) |
| BR-046 | Standardize deterministic machine-readable CLI behavior | — | closed on main (commit history + delivery/ evidence) |
| BR-047 | Add `bundar inspect --json` for routes, packages, and feature boundaries | [#98](https://github.com/ther12k/bundar/issues/98) | open |
| BR-048 | Add `bundar agent-context <feature>` bounded context packs | [#99](https://github.com/ther12k/bundar/issues/99) | open |
| BR-049 | Adopt agent-ready GitHub issue read/write/check contracts | [#100](https://github.com/ther12k/bundar/issues/100) | open |
| BR-050 | Dogfood generated typed URLs in the minimal starter | [#101](https://github.com/ther12k/bundar/issues/101) | open |
| BR-051 | Dogfood generated typed URLs in Todo and Admin | [#102](https://github.com/ther12k/bundar/issues/102) | open |
| BR-052 | Add a typed primary-fragment and update-intent response API | [#103](https://github.com/ther12k/bundar/issues/103) | open |
| BR-053 | Remove manual HTML concatenation from reference applications | [#104](https://github.com/ther12k/bundar/issues/104) | open |
| BR-054 | Add safe response header and cookie mutation helpers | [#105](https://github.com/ther12k/bundar/issues/105) | open |
| BR-055 | Add CSRF form-field and session-token composition helpers | [#106](https://github.com/ther12k/bundar/issues/106) | open |
| BR-056 | Refactor examples away from manual cookie and Response reconstruction | [#107](https://github.com/ther12k/bundar/issues/107) | open |
| BR-057 | Define startup, readiness, shutdown, and graceful-stop lifecycle | [#108](https://github.com/ther12k/bundar/issues/108) | open |
| BR-058 | Propagate request cancellation through context, forms, and streams | [#109](https://github.com/ther12k/bundar/issues/109) | open |
| BR-059 | Define the trusted proxy, client IP, scheme, host, and origin model | [#110](https://github.com/ther12k/bundar/issues/110) | open |
| BR-060 | Implement secure-cookie behavior behind explicit trusted proxies | [#111](https://github.com/ther12k/bundar/issues/111) | open |
| BR-061 | Define durable session-store capabilities and failure semantics | [#112](https://github.com/ther12k/bundar/issues/112) | open |
| BR-062 | Fail closed on memory sessions or insecure cookies in production | [#113](https://github.com/ther12k/bundar/issues/113) | open |
| BR-063 | Close session fixation, rotation, logout, and replay tests | [#114](https://github.com/ther12k/bundar/issues/114) | open |
| BR-064 | Validate redirect targets and all HTMX response header values | [#115](https://github.com/ther12k/bundar/issues/115) | open |
| BR-065 | Integrate CSP nonces with documents and `HtmxScript` | [#116](https://github.com/ther12k/bundar/issues/116) | open |
| BR-066 | Enforce multipart and form request-complexity limits | [#117](https://github.com/ther12k/bundar/issues/117) | open |
| BR-067 | Define stable framework error codes and redaction policy | [#118](https://github.com/ther12k/bundar/issues/118) | open |
| BR-068 | Add property and fuzz tests for high-risk parsers and serializers | [#119](https://github.com/ther12k/bundar/issues/119) | open |
| BR-069 | Close HTTP method conformance for HEAD, OPTIONS, 405, and Allow | [#120](https://github.com/ther12k/bundar/issues/120) | open |
| BR-070 | Close route edge-case and collision conformance | [#121](https://github.com/ther12k/bundar/issues/121) | open |
| BR-071 | Close body single-consumption and content-type conformance | [#122](https://github.com/ther12k/bundar/issues/122) | open |
| BR-072 | Close streaming backpressure, cancellation, and late-error conformance | [#123](https://github.com/ther12k/bundar/issues/123) | open |
| BR-073 | Revalidate the neutral HTMX contract against the official v4 upgrade | [#124](https://github.com/ther12k/bundar/issues/124) | open |
| BR-074 | Add Firefox and WebKit browser conformance lanes | [#125](https://github.com/ther12k/bundar/issues/125) | open |
| BR-075 | Add no-JavaScript and accessibility baseline gates | [#126](https://github.com/ther12k/bundar/issues/126) | open |
| BR-076 | Add Carno.js as a fair backend-framework benchmark reference | [#127](https://github.com/ther12k/bundar/issues/127) | open |
| BR-077 | Profile large-table rendering and form parsing, then set beta budgets | [#128](https://github.com/ther12k/bundar/issues/128) | open |
| BR-078 | Freeze alpha-to-beta versioning and publication policy | [#129](https://github.com/ther12k/bundar/issues/129) | open |
| BR-079 | Resolve npm namespace, credentials, provenance, and human approval | [#130](https://github.com/ther12k/bundar/issues/130) | open |
| BR-080 | Re-audit tarballs, exports, licenses, SBOM, and provenance after refactors | [#131](https://github.com/ther12k/bundar/issues/131) | open |
| BR-081 | Publish a guarded canary and verify registry metadata | [#132](https://github.com/ther12k/bundar/issues/132) | open |
| BR-082 | Run an external clean-repository consumer smoke test | [#133](https://github.com/ther12k/bundar/issues/133) | open |
| BR-083 | Build and verify an alpha-to-beta migration fixture | [#134](https://github.com/ther12k/bundar/issues/134) | open |
| BR-084 | Run an independent greenfield human-and-agent usability study | [#135](https://github.com/ther12k/bundar/issues/135) | open |
| BR-085 | Run the beta release gate and issue an evidence-backed go/no-go | [#136](https://github.com/ther12k/bundar/issues/136) | open |
