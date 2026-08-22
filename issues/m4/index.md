# M4 — Forms, Actions & Security

- [GH-057 — Implement bounded form and request-body parsing](gh-057-implement-bounded-form-and-request-body-parsing.md) — P0 / L; depends on GH-017 — **complete 2026-08-21** (closure record and evidence)
- [GH-058 — Implement the Standard Schema validation adapter](gh-058-implement-the-standard-schema-validation-adapter.md) — P0 / L; depends on GH-005, GH-057 — **complete 2026-08-22** (closure record and evidence)
- [GH-059 — Define validation results and field-error rendering data](gh-059-define-validation-results-and-field-error-rendering-data.md) — P0 / M; depends on GH-033, GH-058 — **complete 2026-08-22** (closure record and evidence)
- [GH-060 — Implement progressive validated form actions](gh-060-implement-progressive-validated-form-actions.md) — P0 / L; depends on GH-050, GH-059
- [GH-061 — Implement CSRF primitives and form middleware](gh-061-implement-csrf-primitives-and-form-middleware.md) — P0 / L; depends on GH-018, GH-057
- [GH-062 — Define secure cookie and session integration interfaces](gh-062-define-secure-cookie-and-session-integration-interfaces.md) — P0 / L; depends on GH-018, GH-019
- [GH-063 — Implement flash messages and out-of-band flash regions](gh-063-implement-flash-messages-and-out-of-band-flash-regions.md) — P1 / M; depends on GH-051, GH-062
- [GH-064 — Implement multipart upload policy and safe temporary-file handling](gh-064-implement-multipart-upload-policy-and-safe-temporary-file-handling.md) — P0 / L; depends on GH-057, GH-061
- [GH-065 — Implement page-versus-fragment error negotiation](gh-065-implement-page-versus-fragment-error-negotiation.md) — P0 / L; depends on GH-020, GH-048, GH-059
- [GH-066 — Implement security headers, CSP, and nonce propagation](gh-066-implement-security-headers-csp-and-nonce-propagation.md) — P0 / L; depends on GH-018, GH-032, GH-045
- [GH-067 — Implement request budgets, timeouts, and abort propagation](gh-067-implement-request-budgets-timeouts-and-abort-propagation.md) — P0 / L; depends on GH-018, GH-057 — **complete 2026-08-22** (closure record and evidence)
- [GH-068 — Close the forms and security test matrix](gh-068-close-the-forms-and-security-test-matrix.md) — P0 / L; depends on GH-060, GH-061, GH-062, GH-063, GH-064, GH-065, GH-066, GH-067
- [GH-069 — Run the M4 progressive-workflow security gate](gh-069-run-the-m4-progressive-workflow-security-gate.md) — P0 / M; depends on GH-068
