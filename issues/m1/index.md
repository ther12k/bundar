# M1 — Bun-native HTTP Core

- [GH-011 — Create the @bundar/core package skeleton](gh-011-create-the-bundar-core-package-skeleton.md) — P0 / S; depends on GH-010 — **complete 2026-08-21** (closure record and evidence)
- [GH-012 — Define route descriptor and handler types](gh-012-define-route-descriptor-and-handler-types.md) — P0 / M; depends on GH-011 — **complete 2026-08-21** (closure record and evidence)
- [GH-013 — Implement App builder, grouping, and module mounting](gh-013-implement-app-builder-grouping-and-module-mounting.md) — P0 / M; depends on GH-012 — **complete 2026-08-21** (closure record and evidence)
- [GH-014 — Implement path normalization and route-conflict detection](gh-014-implement-path-normalization-and-route-conflict-detection.md) — P0 / M; depends on GH-012 — **complete 2026-08-21** (closure record and evidence)
- [GH-015 — Compile Bundar routes to Bun.serve native route tables](gh-015-compile-bundar-routes-to-bun-serve-native-route-tables.md) — P0 / L; depends on GH-013, GH-014 — **complete 2026-08-21** (closure record and evidence)
- [GH-016 — Preserve the static Response fast path](gh-016-preserve-the-static-response-fast-path.md) — P1 / S; depends on GH-015 — **complete 2026-08-21** (closure record and evidence)
- [GH-017 — Implement the request context contract](gh-017-implement-the-request-context-contract.md) — P0 / M; depends on GH-015 — **complete 2026-08-21** (closure record and evidence)
- [GH-018 — Implement startup-composed sync and async middleware](gh-018-implement-startup-composed-sync-and-async-middleware.md) — P0 / L; depends on GH-017 — **complete 2026-08-21** (closure record and evidence)
- [GH-019 — Implement params, query, and cookie access adapters](gh-019-implement-params-query-and-cookie-access-adapters.md) — P1 / M; depends on GH-017 — **complete 2026-08-21** (closure record and evidence)
- [GH-020 — Implement HttpError and the global error boundary](gh-020-implement-httperror-and-the-global-error-boundary.md) — P0 / M; depends on GH-017, GH-018 — **complete 2026-08-21** (closure record and evidence)
- [GH-021 — Implement explicit response helpers](gh-021-implement-explicit-response-helpers.md) — P1 / M; depends on GH-017 — **complete 2026-08-21** (closure record and evidence)
- [GH-022 — Implement not-found, method, and lifecycle terminal behavior](gh-022-implement-not-found-method-and-lifecycle-terminal-behavior.md) — P1 / M; depends on GH-015, GH-020, GH-021
- [GH-023 — Close the HTTP core integration and contract test matrix](gh-023-close-the-http-core-integration-and-contract-test-matrix.md) — P0 / L; depends on GH-016, GH-018, GH-019, GH-020, GH-021, GH-022
- [GH-024 — Run the M1 performance and resource gate](gh-024-run-the-m1-performance-and-resource-gate.md) — P0 / M; depends on GH-007, GH-023
- [GH-025 — Run and record the M1 HTTP-core gate](gh-025-run-and-record-the-m1-http-core-gate.md) — P0 / S; depends on GH-023, GH-024
