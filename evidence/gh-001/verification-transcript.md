# GH-001 Verification Transcript

## Environment

| Component | Version |
|---|---|
| Bun runtime | 1.4.0 |
| Node (adversarial preflight check only) | v24.11.0 |
| TypeScript | 6.0.3 |
| ESLint | 10.8.1 |
| typescript-eslint | 8.67.0 |
| Prettier | 3.9.6 |
| @types/bun | 1.3.14 |
| OS | Ubuntu 24.04.4 LTS, kernel 7.0.0-28-generic, x86_64 |

## Canonical verification block

Recorded 2026-08-21 on branch `gh-001-initialize-bun-workspace`.

```text
$ bun --version
1.4.0
  -> exit 0

$ bun install --frozen-lockfile
bundar preflight: ok (bun 1.4.0, minimum 1.4.0)
Done! Checked 105 packages (no changes) [15.00ms]
  -> exit 0

$ bun run format:check
$ prettier --check .
Checking formatting...
All matched files use Prettier code style!
  -> exit 0

$ bun run typecheck
$ tsc --noEmit -p tsconfig.json
  -> exit 0

$ bun test
 4 pass
 0 fail
 28 expect() calls
Ran 4 tests across 1 file. [9.00ms]
  -> exit 0

$ bun run build
  (each of @bundar/core, @bundar/jsx, @bundar/htmx, @bundar/schema,
   @bundar/testing, @bundar/cli, create-bundar emits dist/index.js)
create-bundar build: Exited with code 0
  -> exit 0
```

## Additional checks

### Fresh-checkout install proof

```text
$ rm -rf node_modules
$ bun install --frozen-lockfile
bundar preflight: ok (bun 1.4.0, minimum 1.4.0)
94 packages installed [21.00ms]
  -> exit 0
```

Followed by a full re-run of `format:check`, `lint`, `typecheck`, `bun test`
(4 pass / 0 fail), and `build` — all exit 0. No Node package manager was
involved at any point.

### Unsupported-runtime preflight (adversarial)

```text
$ node scripts/preflight.ts
bundar preflight: this runtime is not Bun.
  detected: node v24.11.0
  required: Bun >= 1.4.0
Bundar supports Bun only (decisions/0002-bun-only-runtime.md).
  -> exit 1
```

The same guard rejects Bun versions below 1.4.0 by semver comparison of
`Bun.version` against the `MINIMUM_BUN_VERSION` constant.

### Clean script

```text
$ bun run clean
removed packages/core/dist
  ... (7 artifact directories total)
clean: removed 7 artifact directories
  -> exit 0
```

## Tooling decisions

1. **TypeScript pinned to 6.0.3, not 7.0.2.** The latest `typescript-eslint`
   (8.67.0) declares a peer range of `typescript >=4.8.4 <6.1.0`; TypeScript 7
   is not yet lintable. Pinning the 6.x line keeps one coherent toolchain.
   Revisit when typescript-eslint supports TypeScript 7.
2. **`@types/bun` at 1.3.14.** This is the newest published types package; it
   lags the 1.4.0 runtime release by one day. Treated as a residual risk, not
   a blocker, for a skeleton with no framework code.
3. **Prettier scope excludes Markdown.** The OKF design corpus is generated,
   frontmatter-rich Markdown; its formatting is owned by the OKF validator
   installed in GH-003. Recorded in `.prettierignore`.

## Deviations and residual risks

- `.github/workflows/ci.yml` defines the verification pipeline but has not
  executed on GitHub-hosted runners because no GitHub remote exists yet.
  Every CI step was executed locally with identical commands and exit codes
  (see above). GitHub automation is configured by GH-009.
- No test failure is skipped, ignored, or downgraded to a warning anywhere in
  the repository.
