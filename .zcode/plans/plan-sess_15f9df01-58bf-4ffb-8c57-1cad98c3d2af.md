## GH-011 — @bundar/core package skeleton

### 1. Define the package contract without runtime behavior
- Update `packages/core/package.json` with explicit Bun engine metadata, `exports` for the runtime/type entry point, `types`, `files` allow-list, package-local `typecheck`/`test` scripts, and the existing build script.
- Keep the package private and with zero runtime dependencies.
- Keep `packages/core/src/index.ts` as an intentionally empty placeholder so no routing, app builder, context, or middleware behavior is introduced before GH-012–GH-025.

### 2. Add package-local import and package-surface tests
- Add `packages/core/test/import.test.ts` that imports the package through `@bundar/core` as a workspace consumer and asserts the placeholder module loads without exposing premature framework behavior.
- Add package-surface assertions verifying the manifest has no runtime dependencies, explicit exports/types, and exposes no route/app symbols yet.
- Provide a strict package-local typecheck path via `packages/core/tsconfig.json` and the package script.

### 3. Implement the required package inspection hook
- Add root `scripts/pack-inspect.ts` and a `pack:inspect` script accepting a package selector such as `@bundar/core`.
- Resolve the workspace package, validate its `files` allow-list and required metadata, pack it into a temporary artifact with Bun's package pack command, inspect the resulting file list, and fail closed on missing/extra files, runtime dependencies, or an unknown package.
- Keep generated tarballs/artifacts outside tracked source and clean them on success/failure.

### 4. Document the bounded skeleton and evidence
- Update `packages/core/README.md` to describe the importable placeholder surface, allow-listed package contents, zero-runtime-dependency policy, and explicit out-of-scope behavior.
- Add `evidence/gh-011/verification-transcript.md` with Bun/TypeScript/OS versions, exact commands, package inspection output, and residual risks.
- Add the GH-011 closure record and checked acceptance criteria to the issue specification, update `issues/m1/index.md`, and append the GH-011 event to `log.md`.

### 5. Verify and deliver
- Run the issue commands and repository checks:
  - `bun run --filter @bundar/core typecheck`
  - `bun test packages/core`
  - `bun run pack:inspect @bundar/core`
  - `bun run format:check`, `bun run lint`, `bun run typecheck`, `bun run docs:validate`, `bun run docs:links`, `bun run architecture:check`, `bun test`, `bun run build`, `bun install --frozen-lockfile`.
- Commit on a dedicated `gh-011-core-package-skeleton` branch, merge/push to `main`, attach exact evidence to GitHub issue #11, close it only after acceptance is checked, and set the project item to `Done` with the evidence URL.
- Leave GH-012 as the next unblocked implementation issue; no routing behavior or public route API is added in this change.