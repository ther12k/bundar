# M5 developer-experience cleanroom report (GH-081)

Generated: 2026-08-22T16:19:39.632Z by `bun run test:dx-cleanroom`.

Simulated fresh checkout: the journey consumes PACKED tarballs via a
local registry (workspace:* rewritten to file: links — the documented
pre-publish transform). No workspace state, globals, or unpublished
registry packages are required beyond public npm (@types/bun,
typescript). Both dialect paths are documented in the getting-started
and migration guides; htmx 4 remains experimental (no GA claim).

| Step | Latency (ms) | Outcome |
| --- | ---: | --- |
| pack @bundar/core | 17 | ok |
| pack @bundar/jsx | 19 | ok |
| pack @bundar/schema | 16 | ok |
| pack @bundar/security | 16 | ok |
| pack @bundar/htmx | 23 | ok |
| pack @bundar/testing | 10 | ok |
| pack @bundar/cli | 12 | ok |
| registry | 245 | 7 packed tarballs with file: rewrites |
| generate | 6 | create-bundar app with packed-tarball deps |
| install | 911 | ok |
| typecheck | 1036 | ok |
| test | 34 | ok |
| build | 25 | ok |
| routes:generate | 61 | ok |
| routes:check | 65 | ok |
| live-http | 5 | health, form PRG, fragment, 422 with clear message |
| routes:check (drifted) | 95 | FAILED exit 1: $ bun ./node_modules/@bundar/cli/src/bin.ts routes check --entry src/app.ts --out src/routes.gen.ts
bundar routes:check: src/routes.gen.ts is stale (routes changed since generation); re-run routes:gen |

Total scripted steps executed: 17 (all exit-0 except the
deliberate drift check, which failed AS REQUIRED with a diagnostic
naming the drifted artifact).

Diagnostic clarity observed:
- validation errors carry the field message verbatim (422 body).
- route-manifest drift names the generated file and the regenerate
  command (`routes check`).

Documentation gaps found: none blocking — the getting-started steps
map 1:1 onto this journey (CI-verified by `bun run test:guides`).
