# M5 developer-experience cleanroom report (GH-081)

Generated: 2026-08-27T11:59:29.775Z by `bun run test:dx-cleanroom`.

Simulated fresh checkout: the journey consumes PACKED tarballs via a
local registry (workspace:* rewritten to file: links — the documented
pre-publish transform). No workspace state, globals, or unpublished
registry packages are required beyond public npm (@types/bun,
typescript). Both dialect paths are documented in the getting-started
and migration guides; htmx 4 remains experimental (no GA claim).

| Step | Latency (ms) | Outcome |
| --- | ---: | --- |
| pack @bundar/core | 11 | ok |
| pack @bundar/jsx | 8 | ok |
| pack @bundar/schema | 9 | ok |
| pack @bundar/forms | 7 | ok |
| pack @bundar/security | 8 | ok |
| pack @bundar/htmx | 13 | ok |
| pack @bundar/testing | 8 | ok |
| pack @bundar/cli | 9 | ok |
| pack create-bundar | 9 | ok |
| registry | 177 | 9 packed tarballs with file: rewrites |
| generate | 9 | create-bundar app with packed-tarball deps |
| install | 72 | ok |
| typecheck | 1408 | ok |
| test | 34 | ok |
| build | 24 | ok |
| routes:generate | 77 | ok |
| routes:check | 79 | ok |
| live-http | 9 | health, form PRG, fragment, 422 with clear message |
| routes:check (drifted) | 82 | FAILED exit 1: $ bun ./node_modules/@bundar/cli/src/bin.ts routes check --entry src/app.ts --out src/routes.gen.ts
bundar routes:check: src/routes.gen.ts is stale (routes changed since generation); re-run routes:gen |

Total scripted steps executed: 19 (all exit-0 except the
deliberate drift check, which failed AS REQUIRED with a diagnostic
naming the drifted artifact).

Diagnostic clarity observed:
- validation errors carry the field message verbatim (422 body).
- route-manifest drift names the generated file and the regenerate
  command (`routes check`).

Documentation gaps found: none blocking — the getting-started steps
map 1:1 onto this journey (CI-verified by `bun run test:guides`).
