# Threat model

The framework's security claims are relative to specific adversaries.
This document enumerates them, what the framework promises against
each, and where the promise ends. The independent review should attempt
to find a path from each adversary to an impact the docs claim is
prevented.

## Adversaries

### A1 — Malicious web attacker (browser-origin)

Controls: their own site/pages, can cause a victim's browser to issue
cross-site requests with cookies attached, can craft links/forms.
Cannot: read cross-site responses (SOP), set the victim's cookies on
the target origin, or tamper with the wire (no network attacker role
here — that is A4's Deployment operator, below).

Promised defenses: CSRF three-way token agreement bound to the session
(TB5), origin normalization independent of spoofable headers (TB6),
`SameSite=Lax` defaults + `HttpOnly` + host-only cookies (TB4),
nonce-based CSP baseline and nosniff (headers), OOB/event JSON encoding
before header writes.

### A2 — Malicious application developer (framework consumer)

Uses the framework and hands the framework hostile inputs by mistake or
by another party (their end-users' form input, filenames, URLs).
This is the PRIMARY adversary for the renderer and parsers: the
framework must make the safe path the default path.

Promised defenses: escaping-by-default with a single branded raw sink
(TB1), bounded parsers (TB2), sanitized upload handling (TB3),
redacted errors (TB7), retained-value redaction, structural URL
validation in redirects and `HX-*` values.

Explicitly NOT promised (application responsibility): HTML
sanitization of `raw()` arguments, open-redirect intent checks, CSS
declaration content, comment contents, upload content verification,
serving user content from the app origin, secret management.

### A3 — Malicious package consumer / supply-chain bystander

Installs `bundar` / `create-bundar` from npm and trusts the bytes.

Promised defenses: reproducible unpacked trees, per-tarball SHA-256 in
the candidate manifest bound to the battery identity record, SBOM +
provenance attestation, post-publish byte verification against the
candidate, `latest` stable-only before 1.0, dry-run parsed before
credential checks, publication only by the maintainer.

Explicitly NOT promised: defense against a compromised maintainer
machine or npm itself beyond the recorded digests; no deterministic
tgz bytes across machines (unpacked trees are the reproducibility
contract — see log.md, 2026-08-29 entry).

### A4 — Misconfigured deployment (operator error as adversary)

Runs the app behind a proxy, without durable sessions, on plain http in
production, or with the in-memory session store.

Promised defenses: production posture checks that fail construction
(insecure cookies without explicit development acknowledgment,
non-durable store only with explicit `allowDegradedNonProduction`),
normalized-origin `Secure` derivation, proxy-trust configuration,
`SessionStore` conformance suite for durable adapters.

### A5 — Malicious contributor (CI adversary)

Opens PRs containing hostile build code.

Promised defenses: PRs never touch the self-hosted runner or secrets
(TB8), least-privilege workflow permissions, release workflow is
manual-only and publishes nothing.

## Impact hierarchy the review tests against

1. Cross-origin state change or data exposure in a correctly composed
   application (A1) — highest.
2. XSS through any framework-owned sink (A2).
3. Identity fixation/resurrection or cross-request session bleed (A1/A4).
4. Publishing bytes that differ from the verified candidate (A3).
5. Secret/runner exposure through CI (A5).
6. Information leaks in errors/logs (A2's end-users as victims).

## Non-goals

- Denial of service beyond enforced per-request limits (documented
  limits bound memory; a distributed flood is an operator concern).
- Cryptography beyond session-id/token generation (no custom crypto is
  used — reviewer should confirm that remains true).
- Runtime hardening of the Bun platform itself (Bun >= 1.4.0 is the
  declared runtime; platform CVEs are out of scope).
