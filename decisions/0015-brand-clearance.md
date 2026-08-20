---
type: Architecture Decision
title: "ADR-0015 — Brand Clearance Record and Temporary Namespace Policy"
description: Evidence-based namespace, registry, domain, and trademark screening for the Bundar name with an explicit temporariness policy and migration path.
tags:
- adr
- architecture-decision
- brand
- naming
- gh-004
status: draft
generated:
  by: agent/zcode
  at: '2026-08-21T22:40:00+07:00'
decision:
  id: ADR-0015
  state: accepted
sources:
- id: npm-registry
  resource: https://registry.npmjs.org
  title: npm registry API
  author: npm
  last_modified: '2026-08-21'
- id: github-api
  resource: https://api.github.com
  title: GitHub REST API
  author: GitHub
  last_modified: '2026-08-21'
---

# Status

**Accepted for implementation** (GH-004) — the screening below is recorded
evidence, not legal advice. Trademark-database screening and counsel review
remain required before any public launch or publication.

# Context

GH-004 requires evidence for using **Bundar** publicly, or an approved
fallback, before publication. The project has no legal entity and no
qualified counsel; every check below is an automated or web search performed
on 2026-08-21 from Jakarta, Indonesia (UTC+7). None of it is a legal opinion.

# Screening record (2026-08-21)

## npm (registry.npmjs.org, anonymous HTTP)

| Identifier | Result |
|---|---|
| `@bundar/core`, `@bundar/jsx`, `@bundar/htmx`, `@bundar/schema`, `@bundar/testing`, `@bundar/cli` | HTTP 404 — not published |
| `bundar` (unscoped) | HTTP 404 — not published |
| `create-bundar` | HTTP 404 — not published |
| npm org `bundar` (packages endpoint) | HTTP 404 — no org packages visible |
| `@bundarjs/core`, `bundarjs` (fallback scope) | HTTP 404 — not published |
| npm search "bundar" | Only unrelated minor packages (`ok-bundar`, an Indonesian word-list dependency); no framework conflict |

## GitHub (api.github.com, anonymous)

| Identifier | Result |
|---|---|
| User `Bundar` | **Exists** — personal account since 2016-01-08, 14 public repos. The organization name `bundar` is therefore **unavailable** (GitHub usernames and orgs share one namespace). |
| Org `bundar` | HTTP 404, but blocked by the existing user above |
| User/org `bundarjs` | HTTP 404 both — **available** (unreserved) |
| Repository search "bundar" | No JavaScript/TypeScript framework named Bundar; unrelated repos only (webshops, the Jakarta Bundaran HI roundabout, `bundarinn` Icelandic personal repo) |

## Other code registries

| Registry | Result |
|---|---|
| PyPI `bundar` | HTTP 404 — not published |
| crates.io `bundar` | HTTP 404 — not published |

## Domains (DNS `NS` status, 2026-08-21)

| Domain | Status |
|---|---|
| `bundar.com` | **Registered** (nameservers at Afternic — parked/for-sale) |
| `bundar.dev`, `bundar.org`, `bundar.io`, `bundar.app` | NXDOMAIN — appear unregistered |
| `bundarjs.org`, `bundarjs.dev` | NXDOMAIN — appear unregistered |

DNS NXDOMAIN is a strong signal, not proof; WHOIS was unavailable locally
(`whois` not installed). Registrar-level confirmation happens at reservation
time.

## Trademarks and word meaning

- **Word meaning:** "bundar" is a common Indonesian/Malay adjective meaning
  "round" (KBBI entry cited in `project/naming-and-brand.md`). Unrelated
  real-world usage (the Bundaran HI roundabout, Mumbai place names such as
  Masjid Bunder) confirms it is a common word in those language areas — a
  distinctiveness limitation, not a software conflict.
- **Web screening (2026-08-21):** no exact "Bundar" software product or
  trademark surfaced. Closest match: **BUNDLAR** (an AR content-management
  platform) — different spelling, different market.
- **Official databases (USPTO TSDR, EUIPO, WIPO Global Brand Database,
  Indonesia DGIP) were NOT searched.** This screening gap is a residual risk
  and a precondition for any public announcement.

# Decision

1. **Keep the product name Bundar.** No namespace evidence contradicts it.
2. **Treat every public identifier as explicitly temporary and unreserved**
   until actually registered: npm scope `@bundar/*` (appears free), CLI
   package `bundar`/`create-bundar` (appear free).
3. **GitHub organization: use `bundarjs`**, because the `bundar` organization
   name is permanently blocked by an existing personal account. Repository
   URL becomes `github.com/bundarjs/bundar` once reserved.
4. **Domains:** do not buy during M0. Preferred order when needed:
   `bundar.dev`, then `bundarjs.org`. `bundar.com` is held by a third party
   (parked) — do not pursue.
5. **Publication gate:** GH-086 (npm dry runs) must re-verify registry
   availability immediately before the first publication, and the npm scope
   plus GitHub org must be reserved before that gate closes. The M0 gate
   (GH-010) records this ADR as evidence, not as completion of reservation.
6. **Announcement gate:** public launch requires official trademark-database
   screening and, where warranted, counsel review — tracked as a residual
   risk, not silently assumed.

# Migration path if the name is later rejected

Nothing has been published (all packages are `private`), so migration is
mechanical and pre-external:

1. Rename scope in all `packages/*/package.json` `name` fields
   (`@bundar/x` → `@bundarjs/x` or the approved scope).
2. Update import specifiers in code, examples, fixtures, benchmarks, and the
   OKF corpus (a mechanical search-and-replace verified by
   `bun run docs:links`, `bun run typecheck`, and `bun test`).
3. Rename the GitHub organization and repository; update `docs/okf/` links.
4. Record a superseding ADR; the product name change itself requires a new
   decision, not a patch.

# Consequences

- Local implementation proceeds under temporary names with no external
  dependency on the final namespace.
- The `bundarjs` GitHub organization is the planned permanent home; the npm
  scope remains `@bundar/*` unless reservation fails, in which case
  `@bundarjs/*` (already screened free) takes over without renaming the
  product.

# Alternatives considered

- Waiting for full trademark clearance before writing any code — rejected:
  GH-004 explicitly states it is a release blocker, not a prototyping
  blocker.
- Using `@bundarjs/*` everywhere now — rejected for now: the primary scope
  appears free and reads better; the fallback stays documented and screened.
