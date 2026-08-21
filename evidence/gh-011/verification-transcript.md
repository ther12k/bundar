# GH-011 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-011-core-package-skeleton`

## Planned verification commands

The issue's planned commands were implemented verbatim (no placeholder
substitution was needed):

```text
$ bun run --filter @bundar/core typecheck
@bundar/core typecheck: Exited with code 0

$ bun test packages/core
 4 pass
 0 fail
 7 expect() calls
Ran 4 tests across 1 file.

$ bun run pack:inspect @bundar/core
pack:inspect: @bundar/core (packages/core)
pack:inspect: runtime dependencies: 0
pack:inspect: files allow-list: src, README.md
pack:inspect: packed 3 files:
  - README.md
  - package.json
  - src/index.ts
pack:inspect: ok
  -> exit 0
```

## Acceptance mapping

- Workspace import: `packages/core/test/import.test.ts` imports `@bundar/core`
  through the root workspace symlink (not a relative path) and asserts the
  module loads with an empty export surface.
- Published files allow-listed: the manifest `files` list (`src`, `README.md`)
  is enforced two ways — the test asserts a non-empty list, and
  `scripts/pack-inspect.ts` packs the package with `bun pm pack`, parses the
  tarball in pure TypeScript (gzip + 512-byte tar headers, GNU longname
  support), and fails on any packed file outside the allow-list (npm's
  unconditional `package.json` excepted) and on any stale allow-list entry.
- Zero runtime dependencies: asserted by the package test, the root skeleton
  test, the architecture boundary check, and `pack:inspect`, which hard-fails
  for `@bundar/core`/`@bundar/jsx` if `dependencies` is non-empty (ADR-0011).
- No premature route behavior: `src/index.ts` remains an intentional empty
  placeholder; the import test asserts the public surface is empty; routing,
  app builder, context, and middleware remain scoped to GH-012–GH-025.

## Adversarial probes

`scripts/pack-inspect.ts` was probed with four failure injections. Each exited
`1` with the intended message, and none leaked a `.tgz` archive (cleanup runs
in `finally`, including on failure):

```text
unknown selector "@bundar/nope"
  -> exit 1: no workspace package named "@bundar/nope"

stale allow-list entry "docs" (no such directory)
  -> exit 1: allow-list entries with no packed files: docs

runtime dependency "hono" injected into @bundar/core
  -> exit 1: zero-runtime-dependency policy (ADR-0011) violated by hono

stray untracked file packages/core/stray.md
  -> observed: bun pm pack itself excludes it via the files allow-list;
     the extras guard remains defense-in-depth for npm always-included types
```

## Regression battery

`format:check`, `lint`, `typecheck`, `docs:validate` (208 documents),
`docs:links` (1052 links), `issues:graph` (96 issues, 213 edges, no cycles),
`docs:check` (11 manifests), `architecture:check` (7 source files, 7 rules),
`bun test` (35 pass / 0 fail — 31 prior + 4 new), `build` (all workspace
packages exit 0), and `bun install --frozen-lockfile` — all exit 0.

## Tooling decision

The planned `pack:inspect` placeholder was implemented as
`scripts/pack-inspect.ts` plus the root `pack:inspect` script. The tarball is
parsed without external tools; system `tar` is not required. Pax header path
overrides are not interpreted (repository paths stay short enough that npm
does not emit them) — recorded as a residual limitation.

## Residual risks

- The publish-time layout (built `dist` output, require/browser export-map
  variants) is deliberately deferred to the M6 packaging gates GH-084–GH-086;
  the package stays `private` and workspace-consumed until then.
- `pack:inspect` currently enforces the ADR-0011 zero-dependency rule only for
  `@bundar/core` and `@bundar/jsx`, the two packages under that policy.
- The workspace-consumer import test lives inside `packages/core/test` and
  resolves through the root workspace symlink; a cross-package consumer
  fixture becomes meaningful from GH-012 onward, when core exports real types.
