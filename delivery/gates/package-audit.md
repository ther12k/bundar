---
type: Release Gate
title: Package Contents, Dependencies, Licenses, and Size Audit
description: Evidence-backed inventory of every release package — files, sizes, dependency policy, licenses, and accidental-content scans, fail-closed.
tags:
- m6
- release
- packages
- audit
- evidence
status: draft
generated:
  by: GH-084 implementation pass
  at: '2026-08-22T00:00:00+07:00'
---

# Package contents, dependencies, licenses, and size audit (GH-084)

## Result

`bun run pack:audit` packs all 8 public packages and passes policy:

| Package | Files | Unpacked | Budget | License |
| --- | ---: | ---: | ---: | --- |
| @bundar/core | 19 | 97.8 KB | 215 KB | MIT |
| @bundar/jsx | 22 | 64.0 KB | 117 KB | MIT |
| @bundar/schema | 7 | 18.9 KB | 59 KB | MIT |
| @bundar/security | 9 | 39.1 KB | 117 KB | MIT |
| @bundar/htmx | 26 | 202.3 KB | 1172 KB | MIT |
| @bundar/testing | 8 | 29.9 KB | 78 KB | MIT |
| @bundar/cli | 11 | 31.1 KB | 146 KB | MIT |
| create-bundar | 6 | 18.0 KB | 59 KB | MIT |

Total: 513 KB unpacked; **0 findings** (no secrets, no private paths,
no test fixtures, no build artifacts, no source maps in packages).

## Policy (fail-closed)

- **Zero runtime dependencies for @bundar/core and @bundar/jsx**
  (ADR-0011) — verified from the packed manifests, not the source tree.
- **No external runtime dependencies anywhere** without an ADR; all
  runtime deps are workspace-internal.
- **Licenses** from the approved SPDX set (MIT included); recorded in
  `artifacts/licenses.json`.
- **Size budgets** per package (the htmx budget covers the two pinned,
  SHA-256-verified vendor assets); exceptions require an ADR or a
  release blocker.
- **Exports/types entries** must exist in every manifest; consumer
  resolution is proven by the GH-081 packed cleanroom.

## Bill of materials

`artifacts/packages/bom.json` — per-package file lists, tarball
SHA-256 hashes, sizes, licenses, dependencies, and findings. The
planned scripts `pack:all`, `licenses:check`, and `secrets:scan` are
realized as modes of this one auditor so the inventory and the checks
cannot drift apart (documented substitution, same exit contract).
