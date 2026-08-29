# Known residual risks (as documented — the reviewer verifies, then judges)

This file lists ONLY limitations the repository itself admits. It is not
a list of vulnerabilities and not an assessment of severity. Two duties
follow for the reviewer:

1. Verify each entry still matches the code (documented drift is a
   finding).
2. Treat the list as a floor, not a ceiling: the review's value is in
   what is missing here.

## Renderer

- `raw()` arguments are caller-sanitized by contract; Bundar ships no
  HTML sanitizer (`docs/security/raw-html.md`, sink inventory #7).
- CSS property injection inside a single declaration is application
  input responsibility (sink inventory #4).
- `--` sequences inside comments are application responsibility
  (sink inventory #6).
- Applications must not feed untrusted markup into OOB update intents
  (sink inventory #8).
- htmx injects an inline `<style>` for indicators at runtime; production
  apps disable `includeIndicatorStyles` or use the development profile
  (`docs/guides/security.md`, header tests).
- htmx 4 support is experimental, opt-in, non-default, pinned to a beta
  with documented deviations (`docs/compatibility/htmx4-beta6.md`,
  `docs/compatibility/support-matrix.md`).

## Requests and forms

- `claimedContentType` is exactly what the client declared; production
  uploads MUST verify content (magic bytes, malware scanning) through
  the `verify` hook; serving user uploads safely is application
  responsibility (`docs/guides/uploads.md`).
- Open-redirect policy is an application concern — the framework
  validates URL structure, not intent (sink inventory #10,
  `docs/security/sink-inventory.md`).
- The generic invalid-submission envelope carries a generic message;
  specific validation text travels in field data — applications that
  render only the generic envelope lose field specificity by design
  (`docs/guides/form-actions.md`).

## Sessions

- The bundled memory store is for tests and single-process demos ONLY;
  production requires a durable store behind the contract, with key
  material managed by the operator (`docs/guides/sessions.md`).
- Stores WITHOUT the `atomicRotate` capability fall back to a
  documented weaker destroy-then-commit path (dual-valid window is
  possible across processes) — permitted, but explicit
  (`docs/guides/sessions.md`).
- Production posture checks allow the in-memory store only with an
  explicit `allowDegradedNonProduction` acknowledgment
  (`docs/guides/sessions.md`).
- No signed/encrypted cookie payloads — deliberate, because the cookie
  carries only an opaque id; a stateless-id scheme would require a
  superseding review (`docs/guides/sessions.md`).

## Platform and release

- Verified platform scope is Linux x64 only; macOS is best-effort for
  local development; Windows/arm64 unclaimed
  (`docs/compatibility/support-matrix.md`) — supply-chain reproducibility
  evidence exists only for the verified platform.
- tgz bytes are not deterministic across machines; only unpacked trees
  are byte-identical by contract — cross-machine tgz equality is NOT a
  property of the release process (`log.md`, 2026-08-29 entry;
  `release:reproduce` checks unpacked trees).
- The publishing guide is `status: draft`, operationally tested in
  rehearsal only — the live publication sequence, rollback, and
  revocation steps are NOT yet verified by a real publication
  (`docs/maintainers/publishing.md`; GH-178 stage 2 waits on the first
  live canary).
- The runtime platform is Bun (pinned >= 1.4.0 install minimum); Bun
  platform CVEs are outside the framework's control.

## Deliberate non-features (absence by design)

- No bundled CSRF exempt-list DSL, no automatic session backend, no
  authentication layer, no rate limiting, no secret store — each is an
  application/infrastructure responsibility the docs route explicitly
  (`docs/guides/security.md`, `SUPPORT.md`).
