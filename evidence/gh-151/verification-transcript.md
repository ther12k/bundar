# GH-151 verification transcript — pin the browser test toolchain (BR-099)

Issue #151 · branch gh-151-browser-toolchain-pin · base main 5a620fc.

## Problem (from the third re-audit)

Lane execution used `npx --yes --package @playwright/cli playwright-cli …`
with an additional unpinned fallback to unpinned `playwright`; the
generated shim always fetched unversioned @playwright/cli; no Playwright
package existed in devDependencies/bun.lock. An exact commit therefore did
NOT pin the browser test environment.

## Change summary

1. Pins (root devDependencies → bun.lock): `@playwright/cli` **0.1.18**,
   `playwright` **1.63.0-alpha-2026-08-05** (the runtime revision the CLI
   itself depends on, now also direct so the `.bin/playwright` installer
   exists locally and in CI).
2. Resolution fails closed: BUNDAR_PLAYWRIGHT_CLI override →
   `<root>/node_modules/.bin/playwright-cli`. Deleted entirely: generated
   npx shim + SHIM_SOURCE, codex-wrapper chain, ci.yml's dual unpinned
   npx line (now `./node_modules/.bin/playwright install --with-deps
   chromium`). No unpinned network resolution remains anywhere in the
   lane path.
3. Toolchain identity: every lane artifact directory receives
   `toolchain.json` = { cli:{name,version}, playwrightRuntime:{version},
   chromiumRevision, chromiumHeadlessShellRevision } read from the
   INSTALLED packages (realpath through bun's .bun store; browsers.json
   from playwright-core resolved THROUGH @playwright/cli since core is
   transitive only).
4. Tests updated to the new contract incl. negative space (empty HOME /
   CODEX_HOME cannot resurrect any fallback) and exact version bindings.

## Commands / results

- `bun add -d @playwright/cli@0.1.18 playwright@1.63.0-alpha-2026-08-05`
  → lockfile updated (frozen-lockfile CI installs identical trees).
- `./node_modules/.bin/playwright --version` → Version
  1.63.0-alpha-2026-08-05; `node_modules/.bin/playwright-cli --version`
  → 0.1.18.
- Lanes on the pinned path: test:a11y PASS (7 scans / 0 blocking);
  test:no-js PASS (keyboard-only PRG flows + admin login/list).
- toolchain.json captured in evidence/gh-151/: cli 0.1.18,
  runtime 1.63.0-alpha-2026-08-05, chromium 1237 (headless shell 1237).
- `bun test tests/browser/lanes/` → 4 pass / 0 fail.
- tsc / eslint / prettier clean; full suite re-run before merge.

## Acceptance criteria

- [x] No unpinned npx invocation remains anywhere lanes can execute.
- [x] Lockfile pins the toolchain; resolution fails closed when the
      pinned local binary is absent.
- [x] Lane artifacts embed toolchain identity (CLI + runtime versions +
      Chromium revision).

Residual risks: Chromium minor-revision drift WITHIN a pinned Playwright
line can still occur if upstream rebuilds browser builds; recorded
revisions make any drift visible in artifacts. Node-24 deprecation
warnings for actions/* are tracked separately (#156).
