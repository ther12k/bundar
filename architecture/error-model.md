---
type: Architecture Specification
title: Errors, Status Semantics, and Recovery
description: Typed HTTP errors, validation failures, application exceptions, HTMX error fragments, and committed-stream failures.
tags:
- errors
- status
- recovery
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
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
---

# Error classes

- `HttpError`: controlled status, code, safe message, headers, optional representation hints.
- `ValidationFailure`: normalized invalid input owned by form middleware.
- Unknown errors: internal faults, logged with correlation data and rendered without leaking secrets.

# HTMX difference

htmx 2 does not swap many error responses by default, while htmx 4 swaps all except selected statuses. Bundar’s adapter owns the compatibility policy so handlers can retain semantic outcomes without manually rewriting status behavior per major version.

# Error response negotiation

The global boundary chooses:

- JSON only when an endpoint explicitly declares an API response;
- full HTML for ordinary page requests;
- fragment HTML with adapter directives for targeted HTMX requests;
- empty safe response when a body is prohibited.

# Logging

Error records include request ID, route ID, status/code, duration, dialect, and cause chain with sensitive fields redacted. Expected 4xx errors are distinguishable from faults.

# Streaming

Before commitment, the boundary may replace the response. After commitment, it cancels the stream and records evidence; no second status line or misleading HTML is emitted.
