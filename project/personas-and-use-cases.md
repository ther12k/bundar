---
type: User Experience Specification
title: Personas and Priority Use Cases
description: Target developers, application classes, journeys, and situations where Bundar is or is not a good fit.
tags:
- personas
- use-cases
- ux
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Personas

## Product application developer

Builds workflow-heavy software and wants server authority, straightforward forms, role-aware pages, tables, filters, and modals without maintaining a SPA state graph.

## Backend TypeScript developer

Is comfortable with Bun and `Request`/`Response`, wants JSX ergonomics, and dislikes framework-specific dependency injection or lifecycle magic.

## Framework maintainer

Needs small reviewable packages, explicit compatibility profiles, benchmark evidence, and controlled API growth.

## Security reviewer

Needs visible trust boundaries for HTML, CSRF, cookies, uploads, response headers, and client scripts.

# Priority application classes

- Admin and operations dashboards
- School and learning-management systems
- Logistics, customs, gate, and warehouse systems
- CRM, ERP, approval, and document workflows
- Booking, scheduling, service requests, and internal portals
- Content management and reporting interfaces

# Canonical journey

1. Create a project with `bunx create-bundar`.
2. Define routes using Hono-like methods.
3. Render pages and fragments from the same server JSX components.
4. Submit ordinary HTML forms enhanced with `hx-post`.
5. Return validation fragments, redirects, flash messages, and related-region updates through `c.action`.
6. Test non-JavaScript and HTMX flows.
7. Run the same application against the htmx 4 adapter before upgrading.

# Poor-fit applications

Browser games, canvas editors, video editing, complex offline-first clients, and interfaces whose main state must live locally in the browser should use a richer client architecture or isolated client islands.
