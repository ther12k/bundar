# GH-058 verification transcript — Standard Schema validation adapter

## Issue

[GH-058 — Implement the Standard Schema validation
adapter](../../issues/m4/gh-058-implement-the-standard-schema-validation-adapter.md)
(branch `gh-058-schema-package`, worktree `bundar-gh-058`, base commit
`0d4c887` = main after the GH-067 merge).

## Environment (exact versions)

- Bun `1.4.0`; TypeScript `6.0.3`; ESLint `10.8.1`; Prettier `3.9.6`.
- Consumer validators (root devDependencies, test-only): **Zod `4.4.3`** and
  **Valibot `1.4.2`** — two independent real-world Standard Schema v1
  implementations, both verified to expose `~standard: { version: 1 }`.
- @bundar/schema `0.0.0` (workspace dependency on @bundar/core `0.0.0` only).
- htmx: not involved. OS: Linux `7.0.0-28-generic` x86_64, 12 CPUs.

## What changed

- `packages/schema/src/standard.ts` (new): spec-copied Standard Schema v1
  types (`StandardSchema`, result/issue/path types).
- `packages/schema/src/validate.ts` (new): `validateSchema()` — accepts sync
  or async validators (the standard permits both), normalizes issues to
  `{ message, path: PropertyKey[] }` (both plain and `{ key }` path segments),
  preserves each library-original issue on `raw` as the explicit escape
  hatch, and fails closed with `SchemaDialectError` for nonconforming schemas
  or malformed results (no guessing).
- `packages/schema/src/sources.ts` (new): input-source mapping —
  `validateForm`/`validateJson` (body read once via the bounded GH-057
  parsers; second reads fail deterministically with `BodyConsumedError`),
  `validateQuery` (repeated keys → `string[]` in submission order),
  `validateParams` (decoded route record), `validateHeaders` (lowercased).
  Coercion stays the validator's job; Bundar never mutates input or output.
- `packages/schema/src/index.ts`, `package.json` (workspace dep
  `@bundar/core`, types/exports/files allow-list, engines, typecheck/test
  scripts), `tsconfig.json` (test include), `README.md` (usage + boundaries).
- `packages/schema/test/` (new): 15 tests — dialect conformance, issue/path
  normalization, raw escape hatch, sync+async, malformed-result fail-closed,
  throwing validators propagate, form/JSON/query/params/headers mapping, and
  double-consumption determinism.
- `tests/consumer/schema/` (new): external consumer fixture with **two real
  validators** (Zod + Valibot) — `fixture.ts` proves type inference flows
  from each schema through the adapter (`ZodUser`/`ValibotSearch` typed
  outputs with zero casts) and `consumer.test.ts` (5 tests) runs form/query/
  JSON validation including coercion, defaults, and failure normalization.
- Root `package.json`: devDependencies zod/valibot + `test:consumer:schema`
  script (tsc project typecheck + runtime); root `tsconfig.json`:
  `@bundar/schema` path.
- `docs/guides/validation.md` (new): source-mapping table, coercion
  responsibility, result shape, escape hatch, consumer-proof pointer.

## Exact commands and exit statuses

1. `bun install --frozen-lockfile` — exit 0 (lockfile updated deliberately
   for the two root devDependencies).
2. `bun test packages/schema` (`bun test ./packages/schema`) — exit 0; 15
   tests, 0 fail.
3. `bun run test:consumer:schema` — exit 0; external tsc project typecheck
   passes (inference proof) + 5 runtime tests.
4. `bun run --filter @bundar/schema typecheck` and `bun run typecheck` —
   exit 0.
5. `bun run lint`, `bun run format:check` — exit 0.
6. `bun test` (full) — exit 0; 417 tests across 52 files, 0 fail, 3,093
   expect() calls.
7. `bun run architecture:check` — exit 0 (51 source files, 7 package rules;
  schema→core allowed, core has no schema edge).
8. `bun run pack:inspect @bundar/schema` — exit 0 (files allow-list
   src+README, single workspace dependency, no other runtime deps);
   `bun run pack:inspect @bundar/core` — exit 0 (still zero runtime
   dependencies).
9. `bun run build` — exit 0. `bun run docs:validate` (210 documents) and
   `bun run docs:links` (1,088 links) — exit 0.

## Acceptance evidence mapping

- "Core functions without schema package installed" — @bundar/core keeps
  zero dependencies (pack:inspect) and the frozen boundaries forbid any
  core→schema edge (architecture check); the schema package is purely
  opt-in.
- "Validation errors remain normalized without losing library-specific
  details behind an explicit escape hatch" — normalized `{ message, path }`
  issues with `raw` carrying the original; consumer tests read zod's
  original issue objects through `raw`.
- "A schema cannot cause double body consumption" — schemas receive decoded
  data only; body sources read once via the bounded parsers and a second
  call fails with `BodyConsumedError` (tested for form and JSON).
- "Type inference is tested in an external consumer" —
  `tests/consumer/schema/fixture.ts` compiles under its own tsc project with
  typed outputs from two different validators; part of
  `test:consumer:schema`.
- Exact commands/versions/locations — this transcript.
- No hidden/skipped failures — all commands exit 0; nothing skipped.
- OKF/log updates — closure record below, `issues/m4/index.md`, `log.md`,
  package README, `docs/guides/validation.md`, this transcript.

## Residual risks and deviations

- The consumer validators are root devDependencies (test-only, never
  shipped in any package); apps bring their own validator at their own
  version.
- `raw` is deliberately opaque vendor data — renderers using it must treat
  it as untrusted display data, not logic inputs.
- The planned verification commands matched the implemented script names
  (`bun test packages/schema`, `test:consumer:schema`, architecture) — no
  substitution was needed beyond path-prefixing the test invocation.

## Newly unblocked

- GH-059 (validation results and field-error rendering data).
