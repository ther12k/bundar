# GH-072 verification transcript — development command and reload loop

## Issue

[GH-072 — Implement the Bundar development command and reload
loop](../../issues/m5/gh-072-implement-the-bundar-development-command-and-reload-loop.md)
(branch `gh-072-dev-command`, worktree `bundar-gh-072`, base commit
`6bb4a64` = main after the GH-074 merge).

## Environment (exact versions)

- Bun `1.4.0` (`--hot` runtime mode); TypeScript `6.0.3`; ESLint
  `10.8.1`; Prettier `3.9.6`; Linux `7.0.0-28-generic` x86_64, 12 CPUs.
- No browser required (loopback HTTP only); no htmx involvement.

## Process model (documented contract)

`bundar dev [--entry <file>] [--port <n>]` spawns ONE child:
`bun [--port n] --hot <entry>` with `NODE_ENV=development`.

- **Reload**: Bun's hot mode re-evaluates changed modules in the SAME
  process and swaps the Bun.serve server on the SAME port. Verified
  empirically before implementation: edit → new response on the same
  port, same PID; the module re-ran (fixture log line printed twice).
- **Diagnostics**: syntax/compile failures print Bun's file:line error
  and the previously-loaded code KEEPS SERVING (verified: response stays
  at the last-good version while the file is broken; process survives).
- **Signals**: SIGINT/SIGTERM are forwarded to the child; after a grace
  period (default 5 s, configurable) the supervisor escalates to SIGKILL;
  the child's exit code propagates. A signal-initiated stop exits 0 —
  Ctrl-C is a normal dev shutdown.
- **Separation from production**: development only. `NODE_ENV=development`
  is forced, no bundling, no production behavior. Production runs
  `bun <entry>` directly.

## What changed

- `packages/cli/src/commands/dev.ts` (new): entry resolution (explicit
  `--entry`/positional, then conventional `src/app.ts`, `src/index.ts`,
  `app.ts`, `index.ts`), fail-closed diagnostics, child argv builder,
  `devCommand` registration with the clean-stop exit policy.
- `packages/cli/src/process/child.ts` (new): `superviseChild` — spawn
  with inherited stdio, signal forwarding + SIGKILL escalation, exit-code
  propagation (128+signal for signal deaths, 127 for spawn failure; the
  promise never rejects), and the `intentionallyStopped` marker.
- `packages/cli/src/cli.ts`: `dev` registered + help text.
- `packages/cli/test/dev/` (new, 13 tests): entry resolution (5), child
  supervisor with REAL subprocesses (5: SIGTERM forwarding + exit code,
  SIGKILL escalation past grace, spawn-failure mapping, natural exit
  propagation, process really gone after stop), and the full integration
  loop (1) through the real `bin.ts` binary plus argv shape (2).
- `test:dev-loop` script (`bun test packages/cli/test/dev`);
  `packages/cli/README.md` dev section documenting the process model.

## Tooling decision

The issue's planned `bun test packages/cli/test/dev/**` is realized as
`bun test packages/cli/test/dev` (Bun test paths take directories), wired
as `bun run test:dev-loop`. Equivalent coverage, recorded here.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0.
2. `bun test packages/cli` — exit 0; 25 tests, 52 expect() calls.
3. `bun run test:dev-loop` — exit 0; 13 tests, 23 expect() calls
   (integration loop: edit → same-port hot swap; syntax error → old code
   serving + process alive; fix applied; SIGINT → exit 0).
4. `bun run typecheck` — exit 0. `bun run lint` — exit 0.
   `bun run format:check` — exit 0.
5. `bun run architecture:check` — exit 0 (84 source files).
6. `bun run pack:inspect @bundar/cli` — exit 0.
7. `bun run api:check` — exit 0 (core surface unchanged).
8. `bun run build` — exit 0. `bun run docs:validate` / `docs:links` /
   `docs:check` — exit 0.
9. `bun test` (full) — exit 0; 743 tests across 90 files, 8,068 expect()
   calls, 0 fail, 0 unexplained skips.

## Acceptance evidence

- **Editing route/component files triggers the documented reload**:
  integration test writes a new version of the app file and observes the
  new response on the same port with the same CLI child process.
- **Syntax failures visible, no duplicate listeners**: the broken file
  produces Bun's diagnostic while the previous version keeps answering;
  the single listener keeps serving (no second port, no process
  restart).
- **SIGINT/SIGTERM cleanup**: supervisor tests assert forwarding, grace
  escalation, and code propagation; the integration stop exits 0.
- **Production separation**: dev forces NODE_ENV=development and spawns
  with `--hot`; production remains `bun <entry>` (README + command
  header).

## Residual risks and deviations

- `bun --hot` re-evaluates modules; app state outside modules (e.g. an
  in-memory store created before a change) survives reloads — Bun
  semantics, inherited by design, documented in the README.
- Hot reload cannot fix a broken initial start (the child exits; the
  dev command propagates the code) — first-run errors are exit-visible,
  not loop-visible.

## Newly unblocked issues

None directly (GH-072 blocks none in the delivery graph); M5 tooling
progresses toward GH-075 and the GH-081 usability gate.
