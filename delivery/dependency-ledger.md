---
type: Delivery Plan
title: Complete Issue Dependency Ledger
description: Generated topological order, parallel execution waves, direct dependencies, and reverse blocking edges for all Bundar microtasks.
tags:
- dependencies
- dag
- github
- microtasks
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Graph summary

- Stable issues: **96**
- Direct dependency edges: **213**
- Execution waves: **30**
- Cycle check: **PASS**
- Topological authority: stable IDs, not repository-specific GitHub numbers.

# Complete ledger

| Issue | Milestone | Area | Priority | Size | Depends on | Blocks |
|---|---|---|---:|---:|---|---|
| [GH-001](../issues/m0/gh-001-initialize-the-bun-workspace-and-repository-skeleton.md) | M0 | repo | P0 | M | — | GH-002, GH-003, GH-004, GH-006, GH-007, GH-008 |
| [GH-002](../issues/m0/gh-002-add-governance-licensing-security-and-contribution-foundations.md) | M0 | repo | P0 | S | GH-001 | GH-004, GH-009, GH-085 |
| [GH-003](../issues/m0/gh-003-install-the-okf-documentation-corpus-and-local-validator.md) | M0 | docs | P0 | M | GH-001 | GH-005, GH-009 |
| [GH-004](../issues/m0/gh-004-clear-the-bundar-brand-and-public-namespaces.md) | M0 | repo | P0 | M | GH-001, GH-002 | GH-005, GH-010 |
| [GH-005](../issues/m0/gh-005-freeze-public-api-principles-and-package-boundaries.md) | M0 | core | P0 | M | GH-003, GH-004 | GH-006, GH-007, GH-008, GH-010, GH-035, GH-039, GH-058 |
| [GH-006](../issues/m0/gh-006-create-architecture-boundary-test-harness.md) | M0 | testing | P1 | M | GH-001, GH-005 | GH-010 |
| [GH-007](../issues/m0/gh-007-create-benchmark-harness-with-raw-bun-and-hono-baselines.md) | M0 | testing | P1 | L | GH-001, GH-005 | GH-010, GH-024, GH-037 |
| [GH-008](../issues/m0/gh-008-create-browser-conformance-harness-for-htmx-2-and-htmx-4-lanes.md) | M0 | testing | P0 | L | GH-001, GH-005 | GH-010, GH-053, GH-054 |
| [GH-009](../issues/m0/gh-009-configure-github-labels-milestones-project-fields-and-automation.md) | M0 | repo | P1 | M | GH-002, GH-003 | GH-010 |
| [GH-010](../issues/m0/gh-010-run-and-record-the-m0-contract-freeze-gate.md) | M0 | release | P0 | M | GH-004, GH-005, GH-006, GH-007, GH-008, GH-009 | GH-011, GH-026, GH-039, GH-070 |
| [GH-011](../issues/m1/gh-011-create-the-bundar-core-package-skeleton.md) | M1 | core | P0 | S | GH-010 | GH-012, GH-026 |
| [GH-012](../issues/m1/gh-012-define-route-descriptor-and-handler-types.md) | M1 | routing | P0 | M | GH-011 | GH-013, GH-014, GH-073 |
| [GH-013](../issues/m1/gh-013-implement-app-builder-grouping-and-module-mounting.md) | M1 | core | P0 | M | GH-012 | GH-015 |
| [GH-014](../issues/m1/gh-014-implement-path-normalization-and-route-conflict-detection.md) | M1 | routing | P0 | M | GH-012 | GH-015 |
| [GH-015](../issues/m1/gh-015-compile-bundar-routes-to-bun-serve-native-route-tables.md) | M1 | routing | P0 | L | GH-013, GH-014 | GH-016, GH-017, GH-022, GH-072, GH-073 |
| [GH-016](../issues/m1/gh-016-preserve-the-static-response-fast-path.md) | M1 | routing | P1 | S | GH-015 | GH-023 |
| [GH-017](../issues/m1/gh-017-implement-the-request-context-contract.md) | M1 | core | P0 | M | GH-015 | GH-018, GH-019, GH-020, GH-021, GH-057 |
| [GH-018](../issues/m1/gh-018-implement-startup-composed-sync-and-async-middleware.md) | M1 | middleware | P0 | L | GH-017 | GH-020, GH-023, GH-061, GH-062, GH-066, GH-067 |
| [GH-019](../issues/m1/gh-019-implement-params-query-and-cookie-access-adapters.md) | M1 | core | P1 | M | GH-017 | GH-023, GH-062 |
| [GH-020](../issues/m1/gh-020-implement-httperror-and-the-global-error-boundary.md) | M1 | core | P0 | M | GH-017, GH-018 | GH-022, GH-023, GH-065 |
| [GH-021](../issues/m1/gh-021-implement-explicit-response-helpers.md) | M1 | core | P1 | M | GH-017 | GH-022, GH-023, GH-033, GH-045 |
| [GH-022](../issues/m1/gh-022-implement-not-found-method-and-lifecycle-terminal-behavior.md) | M1 | routing | P1 | M | GH-015, GH-020, GH-021 | GH-023 |
| [GH-023](../issues/m1/gh-023-close-the-http-core-integration-and-contract-test-matrix.md) | M1 | testing | P0 | L | GH-016, GH-018, GH-019, GH-020, GH-021, GH-022 | GH-024, GH-025, GH-074 |
| [GH-024](../issues/m1/gh-024-run-the-m1-performance-and-resource-gate.md) | M1 | testing | P0 | M | GH-007, GH-023 | GH-025, GH-083 |
| [GH-025](../issues/m1/gh-025-run-and-record-the-m1-http-core-gate.md) | M1 | release | P0 | S | GH-023, GH-024 | — |
| [GH-026](../issues/m2/gh-026-create-the-bundar-jsx-package-and-jsx-type-surface.md) | M2 | jsx | P0 | M | GH-010, GH-011 | GH-027 |
| [GH-027](../issues/m2/gh-027-implement-safe-text-primitive-and-empty-child-rendering.md) | M2 | jsx | P0 | M | GH-026 | GH-028, GH-029, GH-031 |
| [GH-028](../issues/m2/gh-028-implement-html-attributes-class-style-and-boolean-serialization.md) | M2 | jsx | P0 | L | GH-027 | GH-032, GH-035 |
| [GH-029](../issues/m2/gh-029-implement-fragments-arrays-iterables-and-functional-components.md) | M2 | jsx | P0 | L | GH-027 | GH-030, GH-032 |
| [GH-030](../issues/m2/gh-030-implement-async-components-and-promised-children.md) | M2 | jsx | P0 | L | GH-029 | GH-033, GH-034 |
| [GH-031](../issues/m2/gh-031-implement-explicit-raw-html-and-trust-boundary-controls.md) | M2 | jsx | P0 | M | GH-027 | GH-036 |
| [GH-032](../issues/m2/gh-032-implement-document-doctype-head-and-void-element-helpers.md) | M2 | jsx | P1 | M | GH-028, GH-029 | GH-033, GH-066 |
| [GH-033](../issues/m2/gh-033-implement-rendertostring-and-jsx-response-integration.md) | M2 | jsx | P0 | M | GH-021, GH-030, GH-032 | GH-034, GH-036, GH-048, GH-050, GH-059 |
| [GH-034](../issues/m2/gh-034-implement-rendertostream-with-backpressure-and-abort-handling.md) | M2 | jsx | P1 | L | GH-030, GH-033 | — |
| [GH-035](../issues/m2/gh-035-add-typed-common-htmx-attributes-without-runtime-coupling.md) | M2 | jsx | P1 | M | GH-005, GH-028 | GH-036, GH-047, GH-051 |
| [GH-036](../issues/m2/gh-036-close-jsx-conformance-security-and-snapshot-coverage.md) | M2 | testing | P0 | L | GH-031, GH-033, GH-035 | GH-037, GH-038 |
| [GH-037](../issues/m2/gh-037-run-the-m2-jsx-performance-and-memory-gate.md) | M2 | testing | P1 | M | GH-007, GH-036 | GH-038, GH-083 |
| [GH-038](../issues/m2/gh-038-run-and-record-the-m2-server-jsx-gate.md) | M2 | release | P0 | S | GH-036, GH-037 | GH-071, GH-079 |
| [GH-039](../issues/m3/gh-039-create-bundar-htmx-and-the-version-neutral-protocol-model.md) | M3 | htmx | P0 | M | GH-010, GH-005 | GH-040 |
| [GH-040](../issues/m3/gh-040-define-the-htmx-dialect-adapter-interface.md) | M3 | htmx | P0 | L | GH-039 | GH-041, GH-042, GH-046, GH-047 |
| [GH-041](../issues/m3/gh-041-implement-normalized-htmx-request-metadata.md) | M3 | htmx | P0 | L | GH-040 | GH-043, GH-044, GH-048 |
| [GH-042](../issues/m3/gh-042-implement-normalized-htmx-response-directives.md) | M3 | htmx | P0 | L | GH-040 | GH-043, GH-044, GH-050, GH-052 |
| [GH-043](../issues/m3/gh-043-implement-and-pin-the-stable-htmx-2-dialect-adapter.md) | M3 | htmx | P0 | L | GH-041, GH-042 | GH-045, GH-046, GH-047, GH-049, GH-051, GH-052, GH-053 |
| [GH-044](../issues/m3/gh-044-implement-the-experimental-htmx-4-beta6-dialect-adapter.md) | M3 | htmx | P0 | L | GH-041, GH-042 | GH-045, GH-046, GH-047, GH-049, GH-051, GH-052, GH-054 |
| [GH-045](../issues/m3/gh-045-implement-the-htmx-asset-registry-and-local-serving-contract.md) | M3 | assets | P1 | M | GH-021, GH-043, GH-044 | GH-053, GH-054, GH-066 |
| [GH-046](../issues/m3/gh-046-normalize-htmx-lifecycle-and-application-events.md) | M3 | htmx | P1 | L | GH-040, GH-043, GH-044 | GH-078 |
| [GH-047](../issues/m3/gh-047-add-inheritance-and-extension-compatibility-helpers.md) | M3 | htmx | P1 | L | GH-035, GH-040, GH-043, GH-044 | GH-078 |
| [GH-048](../issues/m3/gh-048-implement-full-page-and-fragment-negotiation.md) | M3 | htmx | P0 | L | GH-033, GH-041 | GH-049, GH-050, GH-053, GH-054, GH-065 |
| [GH-049](../issues/m3/gh-049-implement-cache-variation-and-history-safety-policy.md) | M3 | htmx | P0 | M | GH-043, GH-044, GH-048 | — |
| [GH-050](../issues/m3/gh-050-implement-the-progressive-action-response-composer.md) | M3 | htmx | P0 | L | GH-033, GH-042, GH-048 | GH-051, GH-052, GH-053, GH-054, GH-060 |
| [GH-051](../issues/m3/gh-051-implement-version-neutral-out-of-band-and-partial-update-intents.md) | M3 | htmx | P0 | L | GH-035, GH-043, GH-044, GH-050 | GH-055, GH-063 |
| [GH-052](../issues/m3/gh-052-implement-redirect-location-and-history-helpers.md) | M3 | htmx | P1 | M | GH-042, GH-043, GH-044, GH-050 | GH-055 |
| [GH-053](../issues/m3/gh-053-close-the-htmx-2-browser-conformance-profile.md) | M3 | testing | P0 | L | GH-008, GH-043, GH-045, GH-048, GH-050 | GH-055 |
| [GH-054](../issues/m3/gh-054-close-the-htmx-4-beta-browser-conformance-profile.md) | M3 | testing | P0 | L | GH-008, GH-044, GH-045, GH-048, GH-050 | GH-055 |
| [GH-055](../issues/m3/gh-055-build-the-unchanged-source-dual-dialect-reference-fixture.md) | M3 | testing | P0 | L | GH-051, GH-052, GH-053, GH-054 | GH-056 |
| [GH-056](../issues/m3/gh-056-run-the-m3-zero-handler-change-dialect-switch-gate.md) | M3 | release | P0 | M | GH-055 | GH-071, GH-079, GH-082, GH-089 |
| [GH-057](../issues/m4/gh-057-implement-bounded-form-and-request-body-parsing.md) | M4 | forms | P0 | L | GH-017 | GH-058, GH-061, GH-064, GH-067 |
| [GH-058](../issues/m4/gh-058-implement-the-standard-schema-validation-adapter.md) | M4 | forms | P0 | L | GH-005, GH-057 | GH-059 |
| [GH-059](../issues/m4/gh-059-define-validation-results-and-field-error-rendering-data.md) | M4 | forms | P0 | M | GH-033, GH-058 | GH-060, GH-065 |
| [GH-060](../issues/m4/gh-060-implement-progressive-validated-form-actions.md) | M4 | forms | P0 | L | GH-050, GH-059 | GH-068, GH-076, GH-077 |
| [GH-061](../issues/m4/gh-061-implement-csrf-primitives-and-form-middleware.md) | M4 | security | P0 | L | GH-018, GH-057 | GH-064, GH-068 |
| [GH-062](../issues/m4/gh-062-define-secure-cookie-and-session-integration-interfaces.md) | M4 | security | P0 | L | GH-018, GH-019 | GH-063, GH-068, GH-077 |
| [GH-063](../issues/m4/gh-063-implement-flash-messages-and-out-of-band-flash-regions.md) | M4 | forms | P1 | M | GH-051, GH-062 | GH-068, GH-076, GH-077 |
| [GH-064](../issues/m4/gh-064-implement-multipart-upload-policy-and-safe-temporary-file-handling.md) | M4 | forms | P0 | L | GH-057, GH-061 | GH-068 |
| [GH-065](../issues/m4/gh-065-implement-page-versus-fragment-error-negotiation.md) | M4 | htmx | P0 | L | GH-020, GH-048, GH-059 | GH-068 |
| [GH-066](../issues/m4/gh-066-implement-security-headers-csp-and-nonce-propagation.md) | M4 | security | P0 | L | GH-018, GH-032, GH-045 | GH-068 |
| [GH-067](../issues/m4/gh-067-implement-request-budgets-timeouts-and-abort-propagation.md) | M4 | core | P0 | L | GH-018, GH-057 | GH-068 |
| [GH-068](../issues/m4/gh-068-close-the-forms-and-security-test-matrix.md) | M4 | testing | P0 | L | GH-060, GH-061, GH-062, GH-063, GH-064, GH-065, GH-066, GH-067 | GH-069 |
| [GH-069](../issues/m4/gh-069-run-the-m4-progressive-workflow-security-gate.md) | M4 | release | P0 | M | GH-068 | GH-071, GH-079, GH-082 |
| [GH-070](../issues/m5/gh-070-create-the-bundar-cli-package-and-command-framework.md) | M5 | cli | P1 | M | GH-010 | GH-071, GH-072, GH-073, GH-074, GH-078 |
| [GH-071](../issues/m5/gh-071-implement-create-bundar-scaffolding.md) | M5 | cli | P0 | L | GH-038, GH-056, GH-069, GH-070 | GH-075 |
| [GH-072](../issues/m5/gh-072-implement-the-bundar-development-command-and-reload-loop.md) | M5 | cli | P1 | L | GH-015, GH-070 | — |
| [GH-073](../issues/m5/gh-073-generate-route-manifests-and-typed-url-builders.md) | M5 | cli | P0 | L | GH-012, GH-015, GH-070 | GH-075, GH-079 |
| [GH-074](../issues/m5/gh-074-implement-the-in-process-test-client-and-request-helpers.md) | M5 | testing | P0 | L | GH-023, GH-070 | GH-075 |
| [GH-075](../issues/m5/gh-075-create-and-verify-the-minimal-starter-template.md) | M5 | docs | P0 | M | GH-071, GH-073, GH-074 | GH-076, GH-077 |
| [GH-076](../issues/m5/gh-076-build-the-todo-reference-application.md) | M5 | docs | P1 | L | GH-060, GH-063, GH-075 | GH-080, GH-093 |
| [GH-077](../issues/m5/gh-077-build-the-admin-crud-reference-application.md) | M5 | docs | P1 | L | GH-060, GH-062, GH-063, GH-075 | GH-080, GH-093 |
| [GH-078](../issues/m5/gh-078-implement-the-htmx-2-to-4-audit-and-migration-linter.md) | M5 | cli | P0 | L | GH-046, GH-047, GH-070 | GH-080 |
| [GH-079](../issues/m5/gh-079-publish-generated-api-reference-and-compatibility-documentation-source.md) | M5 | docs | P0 | L | GH-038, GH-056, GH-069, GH-073 | GH-080 |
| [GH-080](../issues/m5/gh-080-write-getting-started-architecture-security-and-htmx-migration-guides.md) | M5 | docs | P0 | L | GH-076, GH-077, GH-078, GH-079 | GH-081 |
| [GH-081](../issues/m5/gh-081-run-the-m5-developer-experience-usability-gate.md) | M5 | testing | P0 | M | GH-080 | GH-082, GH-084 |
| [GH-082](../issues/m6/gh-082-run-the-complete-dual-dialect-end-to-end-matrix.md) | M6 | testing | P0 | L | GH-056, GH-069, GH-081 | GH-083, GH-087, GH-092 |
| [GH-083](../issues/m6/gh-083-run-final-alpha-performance-and-regression-budgets.md) | M6 | testing | P0 | L | GH-024, GH-037, GH-082 | GH-087 |
| [GH-084](../issues/m6/gh-084-audit-package-contents-dependencies-licenses-and-size.md) | M6 | release | P0 | M | GH-081 | GH-085, GH-087 |
| [GH-085](../issues/m6/gh-085-generate-sbom-provenance-checksums-and-reproducible-build-evidence.md) | M6 | release | P0 | L | GH-002, GH-084 | GH-086, GH-087 |
| [GH-086](../issues/m6/gh-086-run-npm-publication-dry-runs-and-export-map-verification.md) | M6 | release | P0 | M | GH-085 | GH-087 |
| [GH-087](../issues/m6/gh-087-write-alpha-release-notes-compatibility-statement-and-known-limitations.md) | M6 | release | P0 | M | GH-082, GH-083, GH-084, GH-085, GH-086 | GH-088 |
| [GH-088](../issues/m6/gh-088-run-the-v0-1-0-alpha-1-release-gate.md) | M6 | release | P0 | L | GH-087 | GH-096 |
| [GH-089](../issues/m7/gh-089-record-the-official-htmx-4-ga-source-snapshot.md) | M7 | htmx | P0 | M | GH-056 | GH-090 |
| [GH-090](../issues/m7/gh-090-diff-the-htmx-4-beta-adapter-against-the-ga-contract.md) | M7 | htmx | P0 | L | GH-089 | GH-091 |
| [GH-091](../issues/m7/gh-091-update-the-htmx-4-adapter-and-fixtures-for-ga.md) | M7 | htmx | P0 | L | GH-090 | GH-092 |
| [GH-092](../issues/m7/gh-092-run-dual-version-regression-ci-against-htmx-2-and-htmx-4-ga.md) | M7 | testing | P0 | L | GH-082, GH-091 | GH-093 |
| [GH-093](../issues/m7/gh-093-prove-reference-applications-run-unchanged-under-htmx-4-ga.md) | M7 | testing | P0 | L | GH-076, GH-077, GH-092 | GH-094 |
| [GH-094](../issues/m7/gh-094-deprecate-beta-adapter-paths-and-publish-the-ga-migration-report.md) | M7 | htmx | P1 | M | GH-093 | GH-095 |
| [GH-095](../issues/m7/gh-095-decide-the-default-htmx-dialect-after-ga-evidence.md) | M7 | htmx | P0 | M | GH-094 | GH-096 |
| [GH-096](../issues/m7/gh-096-release-stable-htmx-4-support.md) | M7 | release | P0 | L | GH-088, GH-095 | — |

# Parallel execution waves

### Wave 1

`GH-001`
### Wave 2

`GH-002`, `GH-003`
### Wave 3

`GH-004`, `GH-009`
### Wave 4

`GH-005`
### Wave 5

`GH-006`, `GH-007`, `GH-008`
### Wave 6

`GH-010`
### Wave 7

`GH-011`, `GH-039`, `GH-070`
### Wave 8

`GH-012`, `GH-026`, `GH-040`
### Wave 9

`GH-013`, `GH-014`, `GH-027`, `GH-041`, `GH-042`
### Wave 10

`GH-015`, `GH-028`, `GH-029`, `GH-031`, `GH-043`, `GH-044`
### Wave 11

`GH-016`, `GH-017`, `GH-030`, `GH-032`, `GH-035`, `GH-046`, `GH-072`, `GH-073`
### Wave 12

`GH-018`, `GH-019`, `GH-021`, `GH-047`, `GH-057`
### Wave 13

`GH-020`, `GH-033`, `GH-045`, `GH-058`, `GH-061`, `GH-062`, `GH-067`, `GH-078`
### Wave 14

`GH-022`, `GH-034`, `GH-036`, `GH-048`, `GH-059`, `GH-064`, `GH-066`
### Wave 15

`GH-023`, `GH-037`, `GH-049`, `GH-050`, `GH-065`
### Wave 16

`GH-024`, `GH-038`, `GH-051`, `GH-052`, `GH-053`, `GH-054`, `GH-060`, `GH-074`
### Wave 17

`GH-025`, `GH-055`, `GH-063`
### Wave 18

`GH-056`, `GH-068`
### Wave 19

`GH-069`, `GH-089`
### Wave 20

`GH-071`, `GH-079`, `GH-090`
### Wave 21

`GH-075`, `GH-091`
### Wave 22

`GH-076`, `GH-077`
### Wave 23

`GH-080`
### Wave 24

`GH-081`
### Wave 25

`GH-082`, `GH-084`
### Wave 26

`GH-083`, `GH-085`, `GH-092`
### Wave 27

`GH-086`, `GH-093`
### Wave 28

`GH-087`, `GH-094`
### Wave 29

`GH-088`, `GH-095`
### Wave 30

`GH-096`

# Scheduling rule

An issue may enter `status:ready` only when all direct dependencies are complete with evidence and any upstream gate is satisfied. A wave is a maximum parallel set from graph structure; maintainer capacity, shared files, and review bandwidth may require less concurrency.
