# @bundar/cli

Bundar command-line interface framework (GH-070).

- Purpose: `bundar` CLI executable, command registry, argument parsing, and diagnostic reporting.
- Executable: `bundar` (defined in `bin.ts`).
- Zero runtime dependencies: uses native Bun APIs and lightweight argument parsing.
- Commands: `info` (diagnostics), `routes generate|check` (GH-073), `dev` (GH-072).
- Future commands: test helpers (GH-074), and HTMX migration audit (GH-078).

## `bundar dev` (GH-072)

Runs the app under `bun --hot <entry>`: edited route/component files are
re-evaluated in the SAME process and the Bun.serve server is swapped on
the same port — no duplicate listeners, no state loss outside modules.
Syntax/compile failures print Bun's diagnostic (file:line) and keep the
previously-loaded code serving until fixed. SIGINT/SIGTERM are forwarded
to the child and escalate to SIGKILL after a grace period; a
signal-initiated stop exits 0. Development ONLY: production runs
`bun <entry>` directly — the dev command sets `NODE_ENV=development` and
never bundles or gains production behavior.
