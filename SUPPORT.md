# Support Policy

## Project status

Bundar is pre-1.0 alpha software under active development. Published
candidates ride non-default dist-tags (`canary` / `alpha` — never `latest`
before 1.0, per ADR-0021). APIs may still change without deprecation shims
until the public API contract is frozen for 1.0 (milestone M9;
`project/open-source-strategy.md`, Stability promise).

## What is supported

- **Bugs and regressions:** open a GitHub issue with reproduction steps,
  environment versions, and evidence. Security vulnerabilities are the
  exception — report them privately per [`SECURITY.md`](SECURITY.md).
- **Questions and usage help:** open a GitHub discussion once discussions are
  enabled (GH-009); until then, issues are acceptable.
- **Feature proposals:** open an issue referencing the relevant roadmap area
  in [`delivery/roadmap.md`](delivery/roadmap.md).

## What is not supported

- No long-term support, backports, or SLAs exist before maintainers approve
  them. These commitments will be published only when the project reaches a
  release cadence.
- Unmodified forks, example applications deployed to production, and
  third-party extensions are supported by their respective maintainers.
- Versions of Bun below the minimum pinned in the root `package.json`
  (`engines.bun`) are unsupported; the preflight script fails closed on them.

## Compatibility support

Runtime and dialect compatibility is governed by the compatibility matrix
(`protocol/compatibility-matrix.md`). Compatibility claims require recorded
conformance evidence, not assertions.
