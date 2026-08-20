# GH-002 Verification Transcript

## Environment

Same toolchain as GH-001: Bun 1.4.0, TypeScript 6.0.3, ESLint 10.8.1,
Prettier 3.9.6, Ubuntu 24.04.4 LTS (kernel 7.0.0-28-generic, x86_64).
Recorded 2026-08-21 on branch `gh-002-governance-foundations`.

## Planned verification block

```text
$ test -f LICENSE && test -f SECURITY.md && test -f CONTRIBUTING.md
  -> exit 0

$ bun run docs:check
$ bun run scripts/docs-check.ts
docs:check: ok (7 governance files, 11 manifests verified)
  -> exit 0
```

`docs:check` replaces the issue's placeholder name with a real implementation
(`scripts/docs-check.ts`) that verifies more than file presence:

1. required governance files exist (`LICENSE`, `CODE_OF_CONDUCT.md`,
   `CONTRIBUTING.md`, `SECURITY.md`, `SUPPORT.md`, `MAINTAINERS.md`,
   `.github/CODEOWNERS`);
2. `LICENSE` is MIT, matching the recommendation in
   `project/open-source-strategy.md`;
3. every workspace manifest (root, 7 packages, 3 examples) declares
   `"license": "MIT"`;
4. `SECURITY.md` describes a private reporting path and GitHub private
   vulnerability reporting;
5. no issue template under `.github/ISSUE_TEMPLATE/` discusses
   vulnerabilities, exploits, or zero-days;
6. `CONTRIBUTING.md` requires evidence, links the OKF corpus, and every
   relative link resolves to an existing file;
7. `CODEOWNERS` assigns ownership for security-sensitive paths
   (`/packages/jsx/`, `/packages/htmx/`) and release automation
   (`/.github/workflows/`).

## Adversarial check

Removing `license` from `packages/core/package.json`:

```text
$ bun run docs:check
docs:check failed with 1 problem:
  - @bundar/core must declare "license": "MIT" to match the repository LICENSE
error: script "docs:check" exited with code 1
```

The same run initially caught a line-wrapped "Report a vulnerability" phrase
in `SECURITY.md`; the matcher was made whitespace-tolerant and the policy text
is unchanged.

## Regression battery after the change

`bun install --frozen-lockfile`, `format:check`, `lint`, `typecheck`,
`bun test` (4 pass / 0 fail), `build` — all exit 0.

## Decisions and residual risks

- License: MIT per `project/open-source-strategy.md` (permissive default).
  Documentation shares the repository license to avoid mixed policies.
- `CODE_OF_CONDUCT.md` uses Contributor Covenant 2.1; conduct reports route
  through the private channels in `SECURITY.md` because no project email
  exists yet.
- `MAINTAINERS.md` and `.github/CODEOWNERS` reference `@bundar-maintainers`
  and "The Bundar Authors" as placeholders until the namespace is cleared
  (GH-004) and GitHub automation is configured (GH-009). No named individuals
  or email addresses were invented.
- Supported-version statements intentionally promise nothing beyond `main`
  until the first alpha (out-of-scope rule in the issue).
