---
type: GitHub Configuration
title: GitHub Issue Manifest
description: Topologically ordered stable-ID manifest for creating and mapping all Bundar implementation issues.
tags:
- github
- manifest
- issues
- dependencies
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Purpose

This table is the human-reviewable manifest for the generated issue corpus. The Markdown issue files are authoritative for scope and acceptance; this manifest is authoritative for topological creation order.

| Stable ID | Title | Milestone | Priority | Size | Depends on | Body file | Labels |
|---|---|---|---:|---:|---|---|---|
| GH-001 | Initialize the Bun workspace and repository skeleton | M0 | P0 | M | — | `issues/m0/gh-001-initialize-the-bun-workspace-and-repository-skeleton.md` | type:chore, area:repo, priority:p0, size:m, status:ready |
| GH-002 | Add governance, licensing, security, and contribution foundations | M0 | P0 | S | GH-001 | `issues/m0/gh-002-add-governance-licensing-security-and-contribution-foundations.md` | type:docs, area:repo, priority:p0, size:s |
| GH-003 | Install the OKF documentation corpus and local validator | M0 | P0 | M | GH-001 | `issues/m0/gh-003-install-the-okf-documentation-corpus-and-local-validator.md` | type:docs, area:docs, priority:p0, size:m |
| GH-004 | Clear the Bundar brand and public namespaces | M0 | P0 | M | GH-001, GH-002 | `issues/m0/gh-004-clear-the-bundar-brand-and-public-namespaces.md` | type:decision, area:repo, priority:p0, size:m |
| GH-005 | Freeze public API principles and package boundaries | M0 | P0 | M | GH-003, GH-004 | `issues/m0/gh-005-freeze-public-api-principles-and-package-boundaries.md` | type:decision, area:core, priority:p0, size:m |
| GH-006 | Create architecture-boundary test harness | M0 | P1 | M | GH-001, GH-005 | `issues/m0/gh-006-create-architecture-boundary-test-harness.md` | type:test, area:testing, priority:p1, size:m |
| GH-007 | Create benchmark harness with raw Bun and Hono baselines | M0 | P1 | L | GH-001, GH-005 | `issues/m0/gh-007-create-benchmark-harness-with-raw-bun-and-hono-baselines.md` | type:perf, area:testing, priority:p1, size:l |
| GH-008 | Create browser conformance harness for HTMX 2 and HTMX 4 lanes | M0 | P0 | L | GH-001, GH-005 | `issues/m0/gh-008-create-browser-conformance-harness-for-htmx-2-and-htmx-4-lanes.md` | type:test, area:testing, priority:p0, size:l |
| GH-009 | Configure GitHub labels, milestones, project fields, and automation | M0 | P1 | M | GH-002, GH-003 | `issues/m0/gh-009-configure-github-labels-milestones-project-fields-and-automation.md` | type:chore, area:repo, priority:p1, size:m |
| GH-010 | Run and record the M0 contract-freeze gate | M0 | P0 | M | GH-004, GH-005, GH-006, GH-007, GH-008, GH-009 | `issues/m0/gh-010-run-and-record-the-m0-contract-freeze-gate.md` | type:release, area:release, priority:p0, size:m |
| GH-011 | Create the @bundar/core package skeleton | M1 | P0 | S | GH-010 | `issues/m1/gh-011-create-the-bundar-core-package-skeleton.md` | type:feature, area:core, priority:p0, size:s |
| GH-012 | Define route descriptor and handler types | M1 | P0 | M | GH-011 | `issues/m1/gh-012-define-route-descriptor-and-handler-types.md` | type:feature, area:routing, priority:p0, size:m |
| GH-013 | Implement App builder, grouping, and module mounting | M1 | P0 | M | GH-012 | `issues/m1/gh-013-implement-app-builder-grouping-and-module-mounting.md` | type:feature, area:core, priority:p0, size:m |
| GH-014 | Implement path normalization and route-conflict detection | M1 | P0 | M | GH-012 | `issues/m1/gh-014-implement-path-normalization-and-route-conflict-detection.md` | type:feature, area:routing, priority:p0, size:m |
| GH-015 | Compile Bundar routes to Bun.serve native route tables | M1 | P0 | L | GH-013, GH-014 | `issues/m1/gh-015-compile-bundar-routes-to-bun-serve-native-route-tables.md` | type:feature, area:routing, priority:p0, size:l |
| GH-016 | Preserve the static Response fast path | M1 | P1 | S | GH-015 | `issues/m1/gh-016-preserve-the-static-response-fast-path.md` | type:perf, area:routing, priority:p1, size:s |
| GH-017 | Implement the request context contract | M1 | P0 | M | GH-015 | `issues/m1/gh-017-implement-the-request-context-contract.md` | type:feature, area:core, priority:p0, size:m |
| GH-018 | Implement startup-composed sync and async middleware | M1 | P0 | L | GH-017 | `issues/m1/gh-018-implement-startup-composed-sync-and-async-middleware.md` | type:feature, area:middleware, priority:p0, size:l |
| GH-019 | Implement params, query, and cookie access adapters | M1 | P1 | M | GH-017 | `issues/m1/gh-019-implement-params-query-and-cookie-access-adapters.md` | type:feature, area:core, priority:p1, size:m |
| GH-020 | Implement HttpError and the global error boundary | M1 | P0 | M | GH-017, GH-018 | `issues/m1/gh-020-implement-httperror-and-the-global-error-boundary.md` | type:feature, area:core, priority:p0, size:m |
| GH-021 | Implement explicit response helpers | M1 | P1 | M | GH-017 | `issues/m1/gh-021-implement-explicit-response-helpers.md` | type:feature, area:core, priority:p1, size:m |
| GH-022 | Implement not-found, method, and lifecycle terminal behavior | M1 | P1 | M | GH-015, GH-020, GH-021 | `issues/m1/gh-022-implement-not-found-method-and-lifecycle-terminal-behavior.md` | type:feature, area:routing, priority:p1, size:m |
| GH-023 | Close the HTTP core integration and contract test matrix | M1 | P0 | L | GH-016, GH-018, GH-019, GH-020, GH-021, GH-022 | `issues/m1/gh-023-close-the-http-core-integration-and-contract-test-matrix.md` | type:test, area:testing, priority:p0, size:l |
| GH-024 | Run the M1 performance and resource gate | M1 | P0 | M | GH-007, GH-023 | `issues/m1/gh-024-run-the-m1-performance-and-resource-gate.md` | type:perf, area:testing, priority:p0, size:m |
| GH-025 | Run and record the M1 HTTP-core gate | M1 | P0 | S | GH-023, GH-024 | `issues/m1/gh-025-run-and-record-the-m1-http-core-gate.md` | type:release, area:release, priority:p0, size:s |
| GH-026 | Create the @bundar/jsx package and JSX type surface | M2 | P0 | M | GH-010, GH-011 | `issues/m2/gh-026-create-the-bundar-jsx-package-and-jsx-type-surface.md` | type:feature, area:jsx, priority:p0, size:m |
| GH-027 | Implement safe text, primitive, and empty-child rendering | M2 | P0 | M | GH-026 | `issues/m2/gh-027-implement-safe-text-primitive-and-empty-child-rendering.md` | type:feature, area:jsx, priority:p0, size:m |
| GH-028 | Implement HTML attributes, class, style, and boolean serialization | M2 | P0 | L | GH-027 | `issues/m2/gh-028-implement-html-attributes-class-style-and-boolean-serialization.md` | type:feature, area:jsx, priority:p0, size:l |
| GH-029 | Implement fragments, arrays, iterables, and functional components | M2 | P0 | L | GH-027 | `issues/m2/gh-029-implement-fragments-arrays-iterables-and-functional-components.md` | type:feature, area:jsx, priority:p0, size:l |
| GH-030 | Implement async components and promised children | M2 | P0 | L | GH-029 | `issues/m2/gh-030-implement-async-components-and-promised-children.md` | type:feature, area:jsx, priority:p0, size:l |
| GH-031 | Implement explicit raw HTML and trust-boundary controls | M2 | P0 | M | GH-027 | `issues/m2/gh-031-implement-explicit-raw-html-and-trust-boundary-controls.md` | type:security, area:jsx, priority:p0, size:m |
| GH-032 | Implement document, doctype, head, and void-element helpers | M2 | P1 | M | GH-028, GH-029 | `issues/m2/gh-032-implement-document-doctype-head-and-void-element-helpers.md` | type:feature, area:jsx, priority:p1, size:m |
| GH-033 | Implement renderToString and JSX Response integration | M2 | P0 | M | GH-021, GH-030, GH-032 | `issues/m2/gh-033-implement-rendertostring-and-jsx-response-integration.md` | type:feature, area:jsx, priority:p0, size:m |
| GH-034 | Implement renderToStream with backpressure and abort handling | M2 | P1 | L | GH-030, GH-033 | `issues/m2/gh-034-implement-rendertostream-with-backpressure-and-abort-handling.md` | type:feature, area:jsx, priority:p1, size:l |
| GH-035 | Add typed common HTMX attributes without runtime coupling | M2 | P1 | M | GH-005, GH-028 | `issues/m2/gh-035-add-typed-common-htmx-attributes-without-runtime-coupling.md` | type:feature, area:jsx, priority:p1, size:m |
| GH-036 | Close JSX conformance, security, and snapshot coverage | M2 | P0 | L | GH-031, GH-033, GH-035 | `issues/m2/gh-036-close-jsx-conformance-security-and-snapshot-coverage.md` | type:test, area:testing, priority:p0, size:l |
| GH-037 | Run the M2 JSX performance and memory gate | M2 | P1 | M | GH-007, GH-036 | `issues/m2/gh-037-run-the-m2-jsx-performance-and-memory-gate.md` | type:perf, area:testing, priority:p1, size:m |
| GH-038 | Run and record the M2 server-JSX gate | M2 | P0 | S | GH-036, GH-037 | `issues/m2/gh-038-run-and-record-the-m2-server-jsx-gate.md` | type:release, area:release, priority:p0, size:s |
| GH-039 | Create @bundar/htmx and the version-neutral protocol model | M3 | P0 | M | GH-010, GH-005 | `issues/m3/gh-039-create-bundar-htmx-and-the-version-neutral-protocol-model.md` | type:feature, area:htmx, priority:p0, size:m |
| GH-040 | Define the HTMX dialect adapter interface | M3 | P0 | L | GH-039 | `issues/m3/gh-040-define-the-htmx-dialect-adapter-interface.md` | type:feature, area:htmx, priority:p0, size:l |
| GH-041 | Implement normalized HTMX request metadata | M3 | P0 | L | GH-040 | `issues/m3/gh-041-implement-normalized-htmx-request-metadata.md` | type:feature, area:htmx, priority:p0, size:l |
| GH-042 | Implement normalized HTMX response directives | M3 | P0 | L | GH-040 | `issues/m3/gh-042-implement-normalized-htmx-response-directives.md` | type:feature, area:htmx, priority:p0, size:l |
| GH-043 | Implement and pin the stable HTMX 2 dialect adapter | M3 | P0 | L | GH-041, GH-042 | `issues/m3/gh-043-implement-and-pin-the-stable-htmx-2-dialect-adapter.md` | type:feature, area:htmx, priority:p0, size:l |
| GH-044 | Implement the experimental HTMX 4 beta6 dialect adapter | M3 | P0 | L | GH-041, GH-042 | `issues/m3/gh-044-implement-the-experimental-htmx-4-beta6-dialect-adapter.md` | type:feature, area:htmx, priority:p0, size:l |
| GH-045 | Implement the HTMX asset registry and local serving contract | M3 | P1 | M | GH-021, GH-043, GH-044 | `issues/m3/gh-045-implement-the-htmx-asset-registry-and-local-serving-contract.md` | type:feature, area:assets, priority:p1, size:m |
| GH-046 | Normalize HTMX lifecycle and application events | M3 | P1 | L | GH-040, GH-043, GH-044 | `issues/m3/gh-046-normalize-htmx-lifecycle-and-application-events.md` | type:feature, area:htmx, priority:p1, size:l |
| GH-047 | Add inheritance and extension compatibility helpers | M3 | P1 | L | GH-035, GH-040, GH-043, GH-044 | `issues/m3/gh-047-add-inheritance-and-extension-compatibility-helpers.md` | type:feature, area:htmx, priority:p1, size:l |
| GH-048 | Implement full-page and fragment negotiation | M3 | P0 | L | GH-033, GH-041 | `issues/m3/gh-048-implement-full-page-and-fragment-negotiation.md` | type:feature, area:htmx, priority:p0, size:l |
| GH-049 | Implement cache variation and history safety policy | M3 | P0 | M | GH-043, GH-044, GH-048 | `issues/m3/gh-049-implement-cache-variation-and-history-safety-policy.md` | type:security, area:htmx, priority:p0, size:m |
| GH-050 | Implement the progressive action response composer | M3 | P0 | L | GH-033, GH-042, GH-048 | `issues/m3/gh-050-implement-the-progressive-action-response-composer.md` | type:feature, area:htmx, priority:p0, size:l |
| GH-051 | Implement version-neutral out-of-band and partial update intents | M3 | P0 | L | GH-035, GH-043, GH-044, GH-050 | `issues/m3/gh-051-implement-version-neutral-out-of-band-and-partial-update-intents.md` | type:feature, area:htmx, priority:p0, size:l |
| GH-052 | Implement redirect, location, and history helpers | M3 | P1 | M | GH-042, GH-043, GH-044, GH-050 | `issues/m3/gh-052-implement-redirect-location-and-history-helpers.md` | type:feature, area:htmx, priority:p1, size:m |
| GH-053 | Close the HTMX 2 browser conformance profile | M3 | P0 | L | GH-008, GH-043, GH-045, GH-048, GH-050 | `issues/m3/gh-053-close-the-htmx-2-browser-conformance-profile.md` | type:test, area:testing, priority:p0, size:l |
| GH-054 | Close the HTMX 4 beta browser conformance profile | M3 | P0 | L | GH-008, GH-044, GH-045, GH-048, GH-050 | `issues/m3/gh-054-close-the-htmx-4-beta-browser-conformance-profile.md` | type:test, area:testing, priority:p0, size:l |
| GH-055 | Build the unchanged-source dual-dialect reference fixture | M3 | P0 | L | GH-051, GH-052, GH-053, GH-054 | `issues/m3/gh-055-build-the-unchanged-source-dual-dialect-reference-fixture.md` | type:test, area:testing, priority:p0, size:l |
| GH-056 | Run the M3 zero-handler-change dialect-switch gate | M3 | P0 | M | GH-055 | `issues/m3/gh-056-run-the-m3-zero-handler-change-dialect-switch-gate.md` | type:release, area:release, priority:p0, size:m |
| GH-057 | Implement bounded form and request-body parsing | M4 | P0 | L | GH-017 | `issues/m4/gh-057-implement-bounded-form-and-request-body-parsing.md` | type:feature, area:forms, priority:p0, size:l |
| GH-058 | Implement the Standard Schema validation adapter | M4 | P0 | L | GH-005, GH-057 | `issues/m4/gh-058-implement-the-standard-schema-validation-adapter.md` | type:feature, area:forms, priority:p0, size:l |
| GH-059 | Define validation results and field-error rendering data | M4 | P0 | M | GH-033, GH-058 | `issues/m4/gh-059-define-validation-results-and-field-error-rendering-data.md` | type:feature, area:forms, priority:p0, size:m |
| GH-060 | Implement progressive validated form actions | M4 | P0 | L | GH-050, GH-059 | `issues/m4/gh-060-implement-progressive-validated-form-actions.md` | type:feature, area:forms, priority:p0, size:l |
| GH-061 | Implement CSRF primitives and form middleware | M4 | P0 | L | GH-018, GH-057 | `issues/m4/gh-061-implement-csrf-primitives-and-form-middleware.md` | type:security, area:security, priority:p0, size:l |
| GH-062 | Define secure cookie and session integration interfaces | M4 | P0 | L | GH-018, GH-019 | `issues/m4/gh-062-define-secure-cookie-and-session-integration-interfaces.md` | type:security, area:security, priority:p0, size:l |
| GH-063 | Implement flash messages and out-of-band flash regions | M4 | P1 | M | GH-051, GH-062 | `issues/m4/gh-063-implement-flash-messages-and-out-of-band-flash-regions.md` | type:feature, area:forms, priority:p1, size:m |
| GH-064 | Implement multipart upload policy and safe temporary-file handling | M4 | P0 | L | GH-057, GH-061 | `issues/m4/gh-064-implement-multipart-upload-policy-and-safe-temporary-file-handling.md` | type:security, area:forms, priority:p0, size:l |
| GH-065 | Implement page-versus-fragment error negotiation | M4 | P0 | L | GH-020, GH-048, GH-059 | `issues/m4/gh-065-implement-page-versus-fragment-error-negotiation.md` | type:feature, area:htmx, priority:p0, size:l |
| GH-066 | Implement security headers, CSP, and nonce propagation | M4 | P0 | L | GH-018, GH-032, GH-045 | `issues/m4/gh-066-implement-security-headers-csp-and-nonce-propagation.md` | type:security, area:security, priority:p0, size:l |
| GH-067 | Implement request budgets, timeouts, and abort propagation | M4 | P0 | L | GH-018, GH-057 | `issues/m4/gh-067-implement-request-budgets-timeouts-and-abort-propagation.md` | type:security, area:core, priority:p0, size:l |
| GH-068 | Close the forms and security test matrix | M4 | P0 | L | GH-060, GH-061, GH-062, GH-063, GH-064, GH-065, GH-066, GH-067 | `issues/m4/gh-068-close-the-forms-and-security-test-matrix.md` | type:test, area:testing, priority:p0, size:l |
| GH-069 | Run the M4 progressive-workflow security gate | M4 | P0 | M | GH-068 | `issues/m4/gh-069-run-the-m4-progressive-workflow-security-gate.md` | type:release, area:release, priority:p0, size:m |
| GH-070 | Create the Bundar CLI package and command framework | M5 | P1 | M | GH-010 | `issues/m5/gh-070-create-the-bundar-cli-package-and-command-framework.md` | type:feature, area:cli, priority:p1, size:m |
| GH-071 | Implement create-bundar scaffolding | M5 | P0 | L | GH-038, GH-056, GH-069, GH-070 | `issues/m5/gh-071-implement-create-bundar-scaffolding.md` | type:feature, area:cli, priority:p0, size:l |
| GH-072 | Implement the Bundar development command and reload loop | M5 | P1 | L | GH-015, GH-070 | `issues/m5/gh-072-implement-the-bundar-development-command-and-reload-loop.md` | type:feature, area:cli, priority:p1, size:l |
| GH-073 | Generate route manifests and typed URL builders | M5 | P0 | L | GH-012, GH-015, GH-070 | `issues/m5/gh-073-generate-route-manifests-and-typed-url-builders.md` | type:feature, area:cli, priority:p0, size:l |
| GH-074 | Implement the in-process test client and request helpers | M5 | P0 | L | GH-023, GH-070 | `issues/m5/gh-074-implement-the-in-process-test-client-and-request-helpers.md` | type:feature, area:testing, priority:p0, size:l |
| GH-075 | Create and verify the minimal starter template | M5 | P0 | M | GH-071, GH-073, GH-074 | `issues/m5/gh-075-create-and-verify-the-minimal-starter-template.md` | type:feature, area:docs, priority:p0, size:m |
| GH-076 | Build the Todo reference application | M5 | P1 | L | GH-060, GH-063, GH-075 | `issues/m5/gh-076-build-the-todo-reference-application.md` | type:feature, area:docs, priority:p1, size:l |
| GH-077 | Build the Admin CRUD reference application | M5 | P1 | L | GH-060, GH-062, GH-063, GH-075 | `issues/m5/gh-077-build-the-admin-crud-reference-application.md` | type:feature, area:docs, priority:p1, size:l |
| GH-078 | Implement the HTMX 2-to-4 audit and migration linter | M5 | P0 | L | GH-046, GH-047, GH-070 | `issues/m5/gh-078-implement-the-htmx-2-to-4-audit-and-migration-linter.md` | type:feature, area:cli, priority:p0, size:l |
| GH-079 | Publish generated API reference and compatibility documentation source | M5 | P0 | L | GH-038, GH-056, GH-069, GH-073 | `issues/m5/gh-079-publish-generated-api-reference-and-compatibility-documentation-source.md` | type:docs, area:docs, priority:p0, size:l |
| GH-080 | Write getting-started, architecture, security, and HTMX migration guides | M5 | P0 | L | GH-076, GH-077, GH-078, GH-079 | `issues/m5/gh-080-write-getting-started-architecture-security-and-htmx-migration-guides.md` | type:docs, area:docs, priority:p0, size:l |
| GH-081 | Run the M5 developer-experience usability gate | M5 | P0 | M | GH-080 | `issues/m5/gh-081-run-the-m5-developer-experience-usability-gate.md` | type:test, area:testing, priority:p0, size:m |
| GH-082 | Run the complete dual-dialect end-to-end matrix | M6 | P0 | L | GH-056, GH-069, GH-081 | `issues/m6/gh-082-run-the-complete-dual-dialect-end-to-end-matrix.md` | type:test, area:testing, priority:p0, size:l |
| GH-083 | Run final alpha performance and regression budgets | M6 | P0 | L | GH-024, GH-037, GH-082 | `issues/m6/gh-083-run-final-alpha-performance-and-regression-budgets.md` | type:perf, area:testing, priority:p0, size:l |
| GH-084 | Audit package contents, dependencies, licenses, and size | M6 | P0 | M | GH-081 | `issues/m6/gh-084-audit-package-contents-dependencies-licenses-and-size.md` | type:security, area:release, priority:p0, size:m |
| GH-085 | Generate SBOM, provenance, checksums, and reproducible build evidence | M6 | P0 | L | GH-002, GH-084 | `issues/m6/gh-085-generate-sbom-provenance-checksums-and-reproducible-build-evidence.md` | type:security, area:release, priority:p0, size:l |
| GH-086 | Run npm publication dry runs and export-map verification | M6 | P0 | M | GH-085 | `issues/m6/gh-086-run-npm-publication-dry-runs-and-export-map-verification.md` | type:release, area:release, priority:p0, size:m |
| GH-087 | Write alpha release notes, compatibility statement, and known limitations | M6 | P0 | M | GH-082, GH-083, GH-084, GH-085, GH-086 | `issues/m6/gh-087-write-alpha-release-notes-compatibility-statement-and-known-limitations.md` | type:docs, area:release, priority:p0, size:m |
| GH-088 | Run the v0.1.0-alpha.1 release gate | M6 | P0 | L | GH-087 | `issues/m6/gh-088-run-the-v0-1-0-alpha-1-release-gate.md` | type:release, area:release, priority:p0, size:l |
| GH-089 | Record the official HTMX 4 GA source snapshot | M7 | P0 | M | GH-056 | `issues/m7/gh-089-record-the-official-htmx-4-ga-source-snapshot.md` | type:docs, area:htmx, priority:p0, size:m, status:blocked, status:experimental |
| GH-090 | Diff the HTMX 4 beta adapter against the GA contract | M7 | P0 | L | GH-089 | `issues/m7/gh-090-diff-the-htmx-4-beta-adapter-against-the-ga-contract.md` | type:decision, area:htmx, priority:p0, size:l |
| GH-091 | Update the HTMX 4 adapter and fixtures for GA | M7 | P0 | L | GH-090 | `issues/m7/gh-091-update-the-htmx-4-adapter-and-fixtures-for-ga.md` | type:feature, area:htmx, priority:p0, size:l |
| GH-092 | Run dual-version regression CI against HTMX 2 and HTMX 4 GA | M7 | P0 | L | GH-082, GH-091 | `issues/m7/gh-092-run-dual-version-regression-ci-against-htmx-2-and-htmx-4-ga.md` | type:test, area:testing, priority:p0, size:l |
| GH-093 | Prove reference applications run unchanged under HTMX 4 GA | M7 | P0 | L | GH-076, GH-077, GH-092 | `issues/m7/gh-093-prove-reference-applications-run-unchanged-under-htmx-4-ga.md` | type:test, area:testing, priority:p0, size:l |
| GH-094 | Deprecate beta adapter paths and publish the GA migration report | M7 | P1 | M | GH-093 | `issues/m7/gh-094-deprecate-beta-adapter-paths-and-publish-the-ga-migration-report.md` | type:docs, area:htmx, priority:p1, size:m |
| GH-095 | Decide the default HTMX dialect after GA evidence | M7 | P0 | M | GH-094 | `issues/m7/gh-095-decide-the-default-htmx-dialect-after-ga-evidence.md` | type:decision, area:htmx, priority:p0, size:m |
| GH-096 | Release stable HTMX 4 support | M7 | P0 | L | GH-088, GH-095 | `issues/m7/gh-096-release-stable-htmx-4-support.md` | type:release, area:release, priority:p0, size:l |

# Mapping after creation

Preserve stable IDs in GitHub titles and issue bodies. Record the returned GitHub URL or number in a project field or a maintained mapping table. Never replace stable IDs with numbers in the OKF dependency graph because numbers differ across forks and repositories.
