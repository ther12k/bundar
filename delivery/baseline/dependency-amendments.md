---
type: Dependency Amendment Record
title: Post-Alpha Dependency Amendments (BR-001 rebase)
description: Explicit amendments to the original 85-task dependency graph - BR-054/BR-064 split and the BR-076 beta-chain correction - consumed by the closure validator.
tags:
- m8
- dependencies
- governance
status: stable
updated: '2026-08-23'
---

# Dependency amendments

The closure validator (`bun run issues:check`) enforces that a task cannot
be closed while a declared prerequisite is open, unless an amendment below
covers that exact edge. Original graph source: the review bundle manifest
(189 edges / 85 nodes), embedded machine-readably in
[closure-ledger.json](closure-ledger.json).

## AMEND-1 — BR-054 no longer depends on BR-064

| Field | Value |
| --- | --- |
| Edge removed | `BR-054 → BR-064` |
| Reason | Implementation discovered a clean split: BR-054 owns immutable Response/header/cookie **mutation mechanics** (preserve body/status/multiplicity; fail clearly on committed streams) and never validates destination values. Redirect/location/header **value validation** remains BR-064. |
| Revalidation inputs | BR-064 must test every public helper introduced by BR-054 (`withHeader`, `withHeaderEntries`, `withSetCookie`, `serializeCookie`, `withoutHeader`) against hostile value corpora. |
| Approver | post-alpha review author + maintainer |

## AMEND-2 — BR-077 no longer depends on BR-076

| Field | Value |
| --- | --- |
| Edge removed | `BR-077 → BR-076` |
| Reason | Dependency-direction fix: Bundar's own workload budgets do not require competitor results. The Carno.js comparison becomes an optional informative report permitted to ship after beta; it no longer gates BR-077 → BR-085. |
| Revalidation inputs | none (BR-077 gains its measurement requirements from BR-052/BR-066/BR-071/BR-072). |
| Approver | post-alpha review author + maintainer |

## Effect on the beta gate

`BR-085` (GO/NO-GO) keeps its full prerequisite set minus the transitively
removed Carno.js chain. The validator computes effective prerequisites as
`dependencies[id] − Σ amendments[].removeDependencies` and fails any state
where a closed task still has an open effective prerequisite without an
amendment record.
