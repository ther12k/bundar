# GH-081 verification transcript — M5 developer-experience usability gate

## Issue

[GH-081 — Run the M5 developer-experience usability
gate](../../issues/m5/gh-081-run-the-m5-developer-experience-usability-gate.md)
(branch `gh-081-m5-gate`, worktree `bundar-gh-081`, base commit
`99ef7cc` = main after the GH-080 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`;
  Linux `7.0.0-28-generic` x86_64, 12 CPUs.
- htmx 2.0.10 (stable) / 4.0.0-beta6 (experimental — no GA claim).

## What changed

- `tools/dx-cleanroom.ts` (new) + `test:dx-cleanroom`: the scripted
  clean-environment journey — pack all 7 @bundar packages into a local
  registry (workspace specs rewritten to `file:` tarball links, covering
  BOTH `workspace:*` and bun-pack's bare-`0.0.0` forms), generate an app
  with create-bundar consuming the PACKED tarballs, then execute and
  MEASURE: install → typecheck → test → build → routes:generate →
  routes:check → START with live HTTP assertions (health; no-JS PRG
  303; enhanced 200 fragment; 422 with the exact field message) —
  then the deliberate route-drift error must fail routes:check with a
  diagnostic naming the stale artifact and the fix. 17 measured steps;
  report written to `artifacts/dx/m5-report.md`; full cleanup.
- `tools/pack-consumers.ts` (new) + `test:pack-consumers`: all 8
  publishable packages pack cleanly with verified manifests.
- `delivery/gates/m5.md` (new): the M5 gate record. **M5 closed.**
- **Real defects found by the gate and fixed**: the create-bundar
  template's app lacked (a) a default export — route generation
  failed ("entry must default-export an App") — and (b) named routes —
  drift detection had nothing to check. Both fixed; scaffold,
  template, and guide batteries re-verified green.

## Tooling decisions

- "Packed artifacts, not workspace-only imports" is realized by the
  local tarball registry with `file:` rewrites — the documented
  pre-publish transform (npm rewrites workspace deps at publish time).
  Publication dry runs are GH-086 (M6).
- The "maintainer-blind review / simulated fresh checkout" is the
  scripted cleanroom itself (no workspace state, no globals, public
  npm only) plus the CI-verified guide journey (`test:guides`);
  community surveys are out of scope per the issue.

## Exact commands and exit statuses

1. `bun run test:dx-cleanroom` — exit 0; 17 steps, journey passed;
   report at `artifacts/dx/m5-report.md` (typecheck 1.0–1.1s; install
   ~0.2s warm; live HTTP assertions all green; deliberate drift failed
   with the required diagnostic).
2. `bun run test:pack-consumers` — exit 0; 8/8 packed manifests.
3. `bun run docs:snippets` — exit 0; 7 tests.
4. Re-verification after the template fixes: `test:scaffold -- htmx2`
   exit 0; `test:template -- minimal-htmx2` exit 0; `test:guides`
   10/10.
5. `bun run typecheck` / `lint` / `format:check` — exit 0.
6. `bun run architecture:check` — exit 0 (89 source files).
7. `bun run build` — exit 0; `docs:validate`/`docs:links`/`docs:check`
   — exit 0.
8. `bun test` (full) — exit 0; 824 tests across 100 files, 8,313
   expect() calls, 0 fail, 0 unexplained skips.

## Acceptance evidence

- **Journey succeeds from packed artifacts**: the cleanroom app's
  every @bundar dependency resolves from tarballs; the full chain
  (install/typecheck/test/build/routes/live-HTTP) is green.
- **Deliberate errors are diagnosable**: route rename → routes:check
  fails naming the stale file + regenerate command; invalid form → 422
  with the verbatim field message (both asserted in the journey).
- **Both dialect paths documented; v4 experimental**: guides +
  CI-enforced phrasing tests (GH-080).
- **No hidden globals or unpublished packages**: public npm only for
  @types/bun/typescript.

## Residual risks and deviations

- The registry `file:` transform stands in for real npm publication
  (GH-086). Timings are from this machine (documented in the report).

## Newly unblocked issues

GH-082 (dual-dialect matrix) and GH-084 (package audit) — M6 begins.
