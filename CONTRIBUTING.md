# Contributing to Bundar

Thank you for improving Bundar. This project is maintainer-led during
pre-1.0 development, executes work through the issue backlog in
[`issues/`](issues/index.md), and treats evidence as part of every change.

## Before you start

1. Read the [master agent prompt](MASTER_AGENT_PROMPT.md) — it defines the
   execution protocol, invariants, and stop conditions that apply to every
   change, human or agent.
2. Pick an issue whose dependencies are complete (see the dependency ledger
   in [`delivery/dependency-ledger.md`](delivery/dependency-ledger.md)).
   Keep each pull request scoped to one issue unless the issue explicitly
   authorizes a combined change.
3. Install the toolchain and verify the baseline:

```bash
bun install --frozen-lockfile
bun run preflight
bun run format:check
bun run lint
bun run typecheck
bun test
bun run build
bun run docs:check
bun run docs:validate
bun run issues:graph
```

Bun >= 1.4.0 is the only supported runtime; no Node package manager is
required or expected.

## Making changes

- Follow the coding and review standards in
  [`engineering/coding-standards.md`](engineering/coding-standards.md):
  strict TypeScript, explicit data over hierarchies, validation before
  trust-boundary use, and comments that explain invariants.
- Respect the package boundaries in
  [`engineering/repository-layout.md`](engineering/repository-layout.md).
  In particular: `core` imports only Bun/web-standard APIs, `jsx` never
  imports `core` or `htmx`, and nothing outside `@bundar/htmx` reads raw
  `HX-*` headers or embeds raw htmx lifecycle event names.
- Add or update tests **in the same pull request** as behavior changes.
- Do not weaken acceptance criteria. If a contract is unimplementable or
  contradicted by measured evidence, stop and open a decision issue.

## Evidence requirements

Every pull request that closes an issue must attach:

- exact commands, environment versions, and exit statuses;
- test, benchmark, or trace artifacts required by the issue;
- the closure report from the issue file.

Design and architecture knowledge lives in the OKF corpus at the repository
root (`project/`, `architecture/`, `protocol/`, `engineering/`, `decisions/`)
and, from GH-003 onward, under [`docs/okf/`](docs/okf/README.md). Update the
affected documents and the root [`log.md`](log.md) in the same change.

## Architecture changes

Changes to architecture, compatibility, or public contracts require an ADR
under [`decisions/`](decisions/index.md) following the existing format.

## Security

Never disclose vulnerabilities publicly. Follow
[`SECURITY.md`](SECURITY.md) for coordinated disclosure.

## Licensing

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE), the same as the rest of the repository.
