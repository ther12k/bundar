# GH-027 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-027-jsx-text-primitive` (rebased onto post-GH-015 main)

## Delivered contract

`@bundar/jsx` exports `escapeText`, `escapeAttributeValue`, `renderPrimitive`, and `UnsupportedChildError` from `packages/jsx/src/escape.ts` (re-exported via `src/index.ts` and `src/render/primitive.ts`).

Contract details:

- Text context escapes `&`, `<`, `>`; attribute-value context additionally escapes `"` and `'` so hostile strings cannot break out of either quoting style.
- Omission contract: `null`, `undefined`, `true`, and `false` render as the empty string.
- Strings escape; numbers use canonical `toString()` (non-finite numbers rejected); bigint uses its canonical form.
- Objects, arrays, functions, and symbols are rejected with a diagnostic that names the rejected type and points at alternatives — never `[object Object]` in rendered output, and never leaking the rejected value's enumerable contents.
- Unicode content passes through untouched (BMP and astral).

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0

$ bun run --filter @bundar/jsx typecheck
  -> exit 0

$ bun test ./packages/jsx/test/text-rendering.test.ts
  -> included in the 18-pass run below

$ bun test ./packages/jsx
  18 pass, 0 fail, 1901 expect calls (13 text-rendering + 4 fuzz + 1 runtime)
  -> exit 0

$ bun run typecheck
  -> exit 0

$ bun run lint
  -> exit 0

$ bun run architecture:check
  ok (23 source files, 7 package rules enforced)
  -> exit 0

$ bun run pack:inspect @bundar/jsx
  runtime dependencies: 0
  -> exit 0

$ bun run build / format:check
  -> exit 0
```

Tooling decision (documented): planned test paths run via explicit `./` prefixes under `bun test ./packages/jsx` because Bun 1.4 treats bare filters as name filters; both planned files execute within that run.

## Acceptance evidence

- `&`, `<`, `>`, both quote forms, and Unicode: covered by focused tests plus a 244+-case generated corpus (14 delimiter atoms × pairwise composites + structured hostile composites).
- Nullish/boolean omission: explicitly asserted for all four values.
- Hostile strings (`</script><script>`, `<img onerror>`, `<svg/onload>`, comment breakouts, `\u003c` spellings) cannot break out of text context: after removing legitimate entities, no raw `<`/`>` remains and no bare `<[^&]` sequence appears in output.
- Fuzz/delimiter fixtures: `tests/consumer`… replaced by `packages/jsx/test/fuzz/escaping.test.ts` covering pairwise delimiter combinations, attribute quote neutrality, primitive/text consistency, and idempotence.
- No mandatory test failure was hidden, skipped, or downgraded. Two initially over-strict test assertions were corrected against the real security property (escaped inert text may contain the word "onerror"; diagnostics may name `[object Object]` as the rejected type) — the implementation itself needed no change for those.

## Residual risks

- Raw trusted HTML is deliberately absent (GH-031 owns the explicit trust boundary).
- Attribute serialization into full attribute strings is GH-028 scope; `escapeAttributeValue` here provides the value-level escaping it will build on.
