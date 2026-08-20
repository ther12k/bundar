---
type: Delivery Plan
title: Release and Rollback Plan
description: Pre-release sequence, artifacts, publication checks, rollback, advisories, and compatibility communication.
tags:
- release
- rollback
- npm
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Pre-release sequence

`0.0.x-dev` internal snapshots → `0.1.0-alpha.1` public alpha → later alphas → beta only after readiness definition → 1.0 after API and operational evidence.

# Release artifacts

Package tarballs, checksums, SBOM, provenance attestation, API report, compatibility matrix, benchmark report, conformance results, known limitations, migration notes, and source tag.

# Rollback

Do not overwrite published package versions. Deprecate a bad npm release, publish a fixed patch/pre-release, document affected ranges, and retain reproducible evidence. Security issues follow advisory and coordinated disclosure policy.

# HTMX compatibility communication

Release notes state default dialect, exact tested upstream versions, adapter maturity, and whether reference apps passed unchanged-source migration.
