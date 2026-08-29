# M5 developer-experience cleanroom report (GH-081)

Generated: 2026-08-29T03:06:26.690Z by `bun run test:dx-cleanroom`.

Simulated fresh checkout: the journey consumes PACKED tarballs via a
local registry (workspace:* rewritten to file: links — the documented
pre-publish transform). No workspace state, globals, or unpublished
registry packages are required beyond public npm (@types/bun,
typescript). Both dialect paths are documented in the getting-started
and migration guides; htmx 4 remains experimental (no GA claim).

| Step | Latency (ms) | Outcome |
| --- | ---: | --- |
| pack @bundar/core | 35 | ok |
| pack @bundar/jsx | 18 | ok |
| pack @bundar/schema | 14 | ok |
| pack @bundar/forms | 15 | ok |
| pack @bundar/security | 23 | ok |
| pack @bundar/htmx | 32 | ok |
| pack @bundar/testing | 15 | ok |
| pack @bundar/cli | 20 | ok |
| pack create-bundar | 14 | ok |
| registry | 354 | 9 packed tarballs with file: rewrites |
| generate | 21 | create-bundar app with packed-tarball deps |
| install | 757 | ok |
| typecheck | 3908 | ok |
| test | 87 | ok |
| build | 47 | ok |
| routes:generate | 133 | ok |
| routes:check | 151 | ok |
| live-http | 15 | health, form PRG, fragment, 422 with clear message |
| routes:check (drifted) | 161 | FAILED exit 1: $ bun ./node_modules/@bundar/cli/src/bin.ts routes check --entry src/app.ts --out src/routes.gen.ts
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
