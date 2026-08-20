# Maintainers and Ownership

Bundar is maintainer-led during pre-1.0 development
(`project/open-source-strategy.md`). This file records who maintains what and
which review is required where. A contributor ladder may be introduced only
after real community participation exists.

## Maintainers

| Area | Maintainers |
|---|---|
| Project lead | The Bundar Authors (initial maintainer team; named maintainers are listed here once the GitHub organization exists — GH-004) |

> Note: individual GitHub handles are intentionally absent until the public
> namespace is cleared in GH-004. `.github/CODEOWNERS` references the
> `@bundar-maintainers` team to be created by GH-009.

## Ownership areas

| Path | Required reviewer | Notes |
|---|---|---|
| `packages/core/` | core owner | Routing compilation, context, middleware, errors; Bun-native delegation invariants |
| `packages/jsx/` | jsx owner | Escaping and trust boundaries; security-sensitive |
| `packages/htmx/` | htmx owner | Dialect adapters; version discipline; conformance fixtures |
| `packages/schema/`, `packages/testing/`, `packages/cli/`, `create-bundar/` | tooling owner | Consumes public package APIs only |
| `SECURITY.md`, `packages/*/src` security primitives | security owner | CSRF, cookies, uploads, headers, limits (M4) |
| `.github/workflows/`, release scripts | release owner | Release tags require the gated workflow; immutable artifacts |
| `decisions/` | any owner + ADR | Architecture and compatibility decisions require ADRs |

## Maintainership rules

1. Maintainers approve pull requests only with the evidence required by
   `CONTRIBUTING.md`; missing evidence is a request-for-changes reason.
2. Security-sensitive changes require a security owner review and adversarial
   tests in the same change.
3. Releases (tags, publication) require the release owner and the gated
   release workflow; no manual publication path exists.
4. Adding a maintainer requires consensus among existing maintainers and a
   public record in this file.
5. Removing or archiving packages requires an ADR.
