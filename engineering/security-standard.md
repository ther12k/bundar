---
type: Security Standard
title: Security Engineering and Verification Standard
description: Threat modeling, secure development, adversarial tests, dependency controls, disclosure, and release evidence.
tags:
- security
- verification
- supply-chain
status: draft
generated:
  by: openai/gpt-5.6-pro
  at: '2026-08-21T21:30:00+07:00'
---

# Required practices

- Maintain a threat model for renderer, forms, assets, proxy handling, uploads, and plugins.
- Add regression tests for every security defect.
- Use dependency review, vulnerability scanning, secret scanning, and license review.
- Minimize production dependencies and pin build tooling through the lockfile.
- Provide a private vulnerability reporting channel before public alpha.
- Do not log cookies, CSRF tokens, authorization headers, passwords, or raw multipart bodies.
- Treat raw HTML, raw headers, and external script URLs as privileged operations.

# Release evidence

Security test command/results, dependency audit, SBOM, provenance attestation, secret scan, known advisories, and unresolved accepted risks.
