---
type: Security Standard
title: Bundar Security Architecture
description: Threat boundaries and secure defaults for rendering, requests, forms, cookies, assets, uploads, errors, and deployment.
tags:
- security
- csrf
- csp
- xss
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Trust boundaries

1. Untrusted data entering JSX text or attributes.
2. Raw HTML and URL-bearing attributes.
3. Cross-site form and HTMX requests.
4. Session and flash cookies.
5. Multipart uploads and filenames.
6. Browser scripts, extensions, and CDN assets.
7. Proxy-derived origin, host, and scheme information.

# Defaults

- Escape all ordinary JSX values.
- Brand and document raw HTML.
- Provide synchronizer-token and double-submit-compatible CSRF primitives, with origin checks where appropriate.
- Default cookies to `HttpOnly`, `SameSite=Lax`, path `/`, and secure production settings.
- Serve pinned local HTMX assets by default; CDN mode requires explicit version and integrity metadata.
- Generate CSP-compatible nonce wiring without requiring `unsafe-inline`.
- Reject oversized bodies and uploads early.
- Do not trust forwarding headers without configured proxy boundaries.
- Redact secrets and sensitive form fields from logs.

# Framework versus application ownership

Bundar provides safe primitives and defaults. Authentication, authorization policy, data classification, rate limits, storage antivirus, and business-level access control remain application responsibilities and must be tested there.
