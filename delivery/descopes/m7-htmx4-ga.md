---
type: Descope Record
title: M7 HTMX 4 GA Chain Descope (v0.1.0-alpha.1 scope)
description: GH-089–GH-096 are closed as not planned — externally blocked on the official htmx 4 GA release, which does not exist upstream; every prerequisite on Bundar's side is built and evidenced.
tags:
- m7
- descope
- htmx
- blocked
- evidence
status: final
generated:
  by: session descope decision (explicitly authorized)
  at: '2026-08-22T00:00:00+07:00'
---

# M7 descope record — the htmx 4 GA chain (GH-089–GH-096)

## Decision

The eight M7 issues are **closed as `not planned` (externally blocked)** —
NOT as completed. Their shared prerequisite, the official htmx 4 GA
release, does not exist upstream. This record keeps the tracker honest
about the shipped v0.1.0-alpha.1 scope (see the
[alpha release gate](../gates/alpha.md)).

## The blocking fact (verified three ways, re-verified at descope time)

- npm registry: `dist-tags` = `latest: 2.0.10`, `next: 4.0.0-beta6`;
  of all published 4.x versions, every one is an alpha or beta — zero
  GA candidates.
- htmx GitHub releases: newest 4.x tag is `v4.0.0-beta6`.
- The official essay ["The fetch()ening"](https://htmx.org/essays/the-fetchening/)
  planned a 4.0.0 release in early-to-mid 2026; secondary reporting
  suggests possible slippage toward 2027. No GA announcement exists.

## What shipped instead (the evidenced beta baseline)

Bundar's htmx 4 support is complete and honest at the beta pin:
adapter `maturity: experimental` (4.0.0-beta6, SHA-256-verified local
asset), the 19-suite dual-dialect release matrix with 6 classified
beta deviations, audit-first migration tooling (`bundar htmx-audit`),
enforced dialect.ts-only switching with one-file rollback, and
reference apps proven unchanged-source across lanes. No GA claim is
made anywhere (machine-enforced by `release:notes-check`).

## Reopen trigger and the ready plan

**When htmx 4 GA ships upstream, reopen GH-089–GH-096 and execute in
order**: GH-089 (GA source snapshot) → GH-090 (beta-vs-GA contract
diff) → GH-091 (adapter update) → GH-092 (dual-version regression CI)
→ GH-093 (reference apps unchanged under GA) → GH-094 (deprecate beta
paths + migration report) → GH-095 (default-dialect decision from GA
evidence) → GH-096 (stable release). The [migration
guide](../../docs/guides/htmx-migration.md) documents the procedure
this chain will follow.
