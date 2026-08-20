# GH-004 Verification Transcript

## Environment

Bun 1.4.0 (for `docs:validate`); research via anonymous HTTPS (curl 8) and
DNS (`dig`) from Jakarta, Indonesia (UTC+7) on **2026-08-21**, plus one web
search pass. Recorded on branch `gh-004-brand-clearance`.

## Planned verification block

```text
$ bun run docs:validate
docs:validate: ok (206 documents, 96 issues, local structural validation only — it is not certification by Google or any third party)
  -> exit 0

$ test -f decisions/0015-brand-clearance.md
  -> exit 0
```

Path deviation (documented per the issue's tooling-decision rule): the OKF
bundle root is the repository root (fixed by GH-003), so the decision record
lives at `decisions/0015-brand-clearance.md` instead of
`docs/okf/decisions/0015-brand-clearance.md`. Equivalent-or-stronger evidence:
the file is a validated corpus concept (`docs:validate` parses its frontmatter
and links) rather than an untracked attachment.

## Namespace research commands and results

### npm registry (all on 2026-08-21)

```text
$ curl -s -o /dev/null -w "%{http_code}" https://registry.npmjs.org/@bundar%2fcore
404   (same result for jsx, htmx, schema, testing, cli)
$ curl -s -o /dev/null -w "%{http_code}" https://registry.npmjs.org/bundar
404
$ curl -s -o /dev/null -w "%{http_code}" https://registry.npmjs.org/create-bundar
404
$ curl -s -o /dev/null -w "%{http_code}" "https://registry.npmjs.org/-/org/bundar/packages?format=json"
404
$ curl -s -o /dev/null -w "%{http_code}" https://registry.npmjs.org/@bundarjs%2fcore
404
$ curl -s "https://registry.npmjs.org/-/v1/search?text=bundar&size=10"
  -> only unrelated minor packages (ok-bundar; an Indonesian word-list
     dependency); no framework conflict
```

### GitHub REST API

```text
$ curl -s https://api.github.com/users/bundar
  login: Bundar, type: User, created_at: 2016-01-08, public_repos: 14
  -> organization name "bundar" is permanently unavailable
$ curl -s -o /dev/null -w "%{http_code}" https://api.github.com/users/bundarjs
404   (orgs/bundarjs also 404 — bundarjs available, unreserved)
$ curl -s "https://api.github.com/search/repositories?q=bundar"
  -> no JS/TS framework named Bundar; unrelated repos only
```

### Other registries

```text
$ curl -s -o /dev/null -w "%{http_code}" https://pypi.org/pypi/bundar/json
404
$ curl -s -A "bundar-brand-check/0.1 (namespace research)" -o /dev/null -w "%{http_code}" https://crates.io/api/v1/crates/bundar
404
```

### Domains (DNS NS status)

```text
$ dig +noall +comments NS bundar.com    -> status: NOERROR   (registered; Afternic nameservers = parked)
$ dig +noall +comments NS bundar.dev    -> status: NXDOMAIN  (appears unregistered)
$ dig +noall +comments NS bundar.org    -> status: NXDOMAIN
$ dig +noall +comments NS bundar.io     -> status: NXDOMAIN
$ dig +noall +comments NS bundar.app    -> status: NXDOMAIN
$ dig +noall +comments NS bundarjs.org  -> status: NXDOMAIN
$ dig +noall +comments NS bundarjs.dev  -> status: NXDOMAIN
```

`whois` was not installed locally; NXDOMAIN is a strong signal, not proof.
Registrar confirmation happens at reservation time.

### Trademarks

Web screening (2026-08-21): no exact "Bundar" software product or trademark;
closest match BUNDLAR (AR CMS, different spelling and market). Official
database screening (USPTO TSDR, EUIPO, WIPO, Indonesia DGIP) was **not**
performed and is recorded as a residual risk and an announcement-gate
precondition in ADR-0015. No search result is treated as legal advice.

## Decision

ADR-0015 (accepted): keep the product name Bundar; all npm identifiers
explicitly temporary and unreserved; GitHub organization planned as
`bundarjs`; no domain purchases in M0; publication gates must re-verify and
reserve before first publish; announcement requires official trademark
screening.

## Residual risks

- Registry availability can change at any time until reservation.
- No official trademark-database search or counsel review yet.
- Social handles (X/Mastodon/etc.) not checked — added to the announcement
  checklist.
