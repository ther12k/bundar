# M2 — Server JSX Runtime

- [GH-026 — Create the @bundar/jsx package and JSX type surface](gh-026-create-the-bundar-jsx-package-and-jsx-type-surface.md) — P0 / M; depends on GH-010, GH-011 — **complete 2026-08-21** (closure record and evidence)
- [GH-027 — Implement safe text, primitive, and empty-child rendering](gh-027-implement-safe-text-primitive-and-empty-child-rendering.md) — P0 / M; depends on GH-026 — **complete 2026-08-21** (closure record and evidence)
- [GH-028 — Implement HTML attributes, class, style, and boolean serialization](gh-028-implement-html-attributes-class-style-and-boolean-serialization.md) — P0 / L; depends on GH-027 — **complete 2026-08-21** (closure record and evidence)
- [GH-029 — Implement fragments, arrays, iterables, and functional components](gh-029-implement-fragments-arrays-iterables-and-functional-components.md) — P0 / L; depends on GH-027 — **complete 2026-08-21** (closure record and evidence)
- [GH-030 — Implement async components and promised children](gh-030-implement-async-components-and-promised-children.md) — P0 / L; depends on GH-029 — **complete 2026-08-21** (closure record and evidence)
- [GH-031 — Implement explicit raw HTML and trust-boundary controls](gh-031-implement-explicit-raw-html-and-trust-boundary-controls.md) — P0 / M; depends on GH-027 — **complete 2026-08-21** (closure record and evidence)
- [GH-032 — Implement document, doctype, head, and void-element helpers](gh-032-implement-document-doctype-head-and-void-element-helpers.md) — P1 / M; depends on GH-028, GH-029
- [GH-033 — Implement renderToString and JSX Response integration](gh-033-implement-rendertostring-and-jsx-response-integration.md) — P0 / M; depends on GH-021, GH-030, GH-032
- [GH-034 — Implement renderToStream with backpressure and abort handling](gh-034-implement-rendertostream-with-backpressure-and-abort-handling.md) — P1 / L; depends on GH-030, GH-033
- [GH-035 — Add typed common HTMX attributes without runtime coupling](gh-035-add-typed-common-htmx-attributes-without-runtime-coupling.md) — P1 / M; depends on GH-005, GH-028
- [GH-036 — Close JSX conformance, security, and snapshot coverage](gh-036-close-jsx-conformance-security-and-snapshot-coverage.md) — P0 / L; depends on GH-031, GH-033, GH-035
- [GH-037 — Run the M2 JSX performance and memory gate](gh-037-run-the-m2-jsx-performance-and-memory-gate.md) — P1 / M; depends on GH-007, GH-036
- [GH-038 — Run and record the M2 server-JSX gate](gh-038-run-and-record-the-m2-server-jsx-gate.md) — P0 / S; depends on GH-036, GH-037
