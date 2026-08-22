# M3 — HTMX Protocol & Dual Dialects

- [GH-039 — Create @bundar/htmx and the version-neutral protocol model](gh-039-create-bundar-htmx-and-the-version-neutral-protocol-model.md) — P0 / M; depends on GH-010, GH-005 — **complete 2026-08-21** (closure record and evidence)
- [GH-040 — Define the HTMX dialect adapter interface](gh-040-define-the-htmx-dialect-adapter-interface.md) — P0 / L; depends on GH-039 — **complete 2026-08-21** (closure record and evidence)
- [GH-041 — Implement normalized HTMX request metadata](gh-041-implement-normalized-htmx-request-metadata.md) — P0 / L; depends on GH-040 — **complete 2026-08-21** (closure record and evidence)
- [GH-042 — Implement normalized HTMX response directives](gh-042-implement-normalized-htmx-response-directives.md) — P0 / L; depends on GH-040 — **complete 2026-08-21** (closure record and evidence)
- [GH-043 — Implement and pin the stable HTMX 2 dialect adapter](gh-043-implement-and-pin-the-stable-htmx-2-dialect-adapter.md) — P0 / L; depends on GH-041, GH-042 — **complete 2026-08-21** (closure record and evidence)
- [GH-044 — Implement the experimental HTMX 4 beta6 dialect adapter](gh-044-implement-the-experimental-htmx-4-beta6-dialect-adapter.md) — P0 / L; depends on GH-041, GH-042 — **complete 2026-08-21** (closure record and evidence)
- [GH-045 — Implement the HTMX asset registry and local serving contract](gh-045-implement-the-htmx-asset-registry-and-local-serving-contract.md) — P1 / M; depends on GH-021, GH-043, GH-044 — **complete 2026-08-22** (closure record and evidence)
- [GH-046 — Normalize HTMX lifecycle and application events](gh-046-normalize-htmx-lifecycle-and-application-events.md) — P1 / L; depends on GH-040, GH-043, GH-044 — **complete 2026-08-22** (closure record and evidence)
- [GH-047 — Add inheritance and extension compatibility helpers](gh-047-add-inheritance-and-extension-compatibility-helpers.md) — P1 / L; depends on GH-035, GH-040, GH-043, GH-044 — **complete 2026-08-22** (closure record and evidence)
- [GH-048 — Implement full-page and fragment negotiation](gh-048-implement-full-page-and-fragment-negotiation.md) — P0 / L; depends on GH-033, GH-041 — **complete 2026-08-22** (closure record and evidence)
- [GH-049 — Implement cache variation and history safety policy](gh-049-implement-cache-variation-and-history-safety-policy.md) — P0 / M; depends on GH-043, GH-044, GH-048 — **complete 2026-08-22** (closure record and evidence)
- [GH-050 — Implement the progressive action response composer](gh-050-implement-the-progressive-action-response-composer.md) — P0 / L; depends on GH-033, GH-042, GH-048 — **complete 2026-08-22** (closure record and evidence)
- [GH-051 — Implement version-neutral out-of-band and partial update intents](gh-051-implement-version-neutral-out-of-band-and-partial-update-intents.md) — P0 / L; depends on GH-035, GH-043, GH-044, GH-050 — **complete 2026-08-22** (closure record and evidence)
- [GH-052 — Implement redirect, location, and history helpers](gh-052-implement-redirect-location-and-history-helpers.md) — P1 / M; depends on GH-042, GH-043, GH-044, GH-050 — **complete 2026-08-22** (closure record and evidence)
- [GH-053 — Close the HTMX 2 browser conformance profile](gh-053-close-the-htmx-2-browser-conformance-profile.md) — P0 / L; depends on GH-008, GH-043, GH-045, GH-048, GH-050
- [GH-054 — Close the HTMX 4 beta browser conformance profile](gh-054-close-the-htmx-4-beta-browser-conformance-profile.md) — P0 / L; depends on GH-008, GH-044, GH-045, GH-048, GH-050
- [GH-055 — Build the unchanged-source dual-dialect reference fixture](gh-055-build-the-unchanged-source-dual-dialect-reference-fixture.md) — P0 / L; depends on GH-051, GH-052, GH-053, GH-054
- [GH-056 — Run the M3 zero-handler-change dialect-switch gate](gh-056-run-the-m3-zero-handler-change-dialect-switch-gate.md) — P0 / M; depends on GH-055
