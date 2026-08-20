---
type: Requirements Specification
title: Bundar Product and Technical Requirements
description: Traceable functional, quality, compatibility, security, tooling, and governance requirements for the initial releases.
tags:
- requirements
- functional
- nonfunctional
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Functional requirements

| ID | Requirement | Initial gate |
|---|---|---|
| FR-001 | Register GET, POST, PUT, PATCH, DELETE, OPTIONS, and explicit HEAD handlers. | M1 |
| FR-002 | Compile registered routes to Bun’s native route table without a second request-time matcher. | M1 |
| FR-003 | Support route grouping, modules, middleware, not-found handling, and a global error boundary. | M1 |
| FR-004 | Expose native request, typed route params, URL/query access, cookies, services, variables, and normalized HTMX metadata. | M1–M3 |
| FR-005 | Render escaped HTML from TSX/JSX, fragments, arrays, sync and async components. | M2 |
| FR-006 | Render full documents, fragments, action responses, and streams. | M2–M3 |
| FR-007 | Parse htmx 2 and htmx 4 request headers into one normalized model. | M3 |
| FR-008 | Serialize navigation, target, swap, selection, refresh, and event directives for both dialects. | M3 |
| FR-009 | Add correct `Vary` behavior when page and fragment representations differ. | M3 |
| FR-010 | Support progressive forms with validation fragments and non-HTMX redirect fallback. | M4 |
| FR-011 | Provide CSRF, secure-cookie, upload-limit, body-limit, CSP, and security-header primitives. | M4 |
| FR-012 | Scaffold projects, generate typed route URLs, audit HTMX 4 readiness, and provide a test client. | M5 |
| FR-013 | Ship at least two reference applications that run unchanged under both HTMX dialects. | M5–M7 |

# Compatibility requirements

| ID | Requirement |
|---|---|
| CR-001 | Bun 1.4.0 is the minimum initial runtime; supported patch ranges are documented per release. |
| CR-002 | htmx 2 stable is the default until an accepted ADR changes it. |
| CR-003 | htmx 4 support is labeled experimental before GA and stable only after GA conformance. |
| CR-004 | Application code using the stable subset changes only adapter selection and installed htmx version during a major switch. |
| CR-005 | Raw version-specific HTMX usage is discoverable by the audit tool and excluded from zero-change guarantees. |

# Quality requirements

| ID | Requirement |
|---|---|
| QR-001 | Core and JSX runtime packages have zero runtime dependencies under the initial policy. |
| QR-002 | Static `Response` routes preserve Bun’s native fast path. |
| QR-003 | Middleware, renderer, and adapter work is composed at startup where possible. |
| QR-004 | Escaping, attributes, URL handling, headers, and route conflicts receive property or adversarial tests. |
| QR-005 | Browser conformance runs against pinned HTMX versions in CI. |
| QR-006 | Benchmarks publish environment and raw data; thresholds are regression gates, not unverifiable headline numbers. |
| QR-007 | Public APIs have API-report or type-snapshot review before alpha. |

# Security requirements

| ID | Requirement |
|---|---|
| SR-001 | Text and attribute values escape by default; raw HTML requires an explicit branded type. |
| SR-002 | `javascript:` and other dangerous URL behavior is documented and guarded in opinionated helpers. |
| SR-003 | CSRF protection supports ordinary and HTMX form submissions. |
| SR-004 | Cookie helpers default to `HttpOnly`, `SameSite=Lax`, and environment-aware `Secure`. |
| SR-005 | Request and upload limits fail closed before unbounded buffering. |
| SR-006 | CSP nonce propagation does not require unsafe inline script defaults. |
| SR-007 | Dependency, provenance, secret, and license checks gate releases. |

# Governance requirements

All architecture changes require ADRs; all milestones require evidence; all current-version claims require source snapshots; no document becomes `stable` merely because local structural validation passes.
