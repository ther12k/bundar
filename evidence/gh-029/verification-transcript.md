# GH-029 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-029-fragments-components`

## Delivered contract

`packages/jsx/src/render/node.ts` exports `renderNode`, `ComponentRenderError`,
`CyclicChildError`, `AsyncComponentError`, and `MAX_COMPONENT_DEPTH` (512).

- **Functional components are ordinary functions** — invoked once with their
  props, no lifecycle, no hooks, no instance identity. Errors are wrapped in
  `ComponentRenderError` naming the component (`Broken` → `component: "Broken"`,
  message includes the cause).
- **Fragment** renders children only; no wrapper node.
- **Nested arrays and approved iterables** (arrays, Sets, generators) flatten
  in source/iteration order at any depth; iterables consumed once.
- **Keys never reach output** — keyed and unkeyed nodes render identically;
  there is no client reconciliation, hydration, or key model (ADR boundary).
- **Cyclic structures fail safely**: self-referencing arrays and mutually
  referencing iterables throw `CyclicChildError`; runaway component recursion
  fails at depth 512 with actionable guidance.
- Promise-returning components fail with an explicit GH-030 pointer
  (`AsyncComponentError`) rather than producing `[object Promise]`.

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0

$ bun run --filter @bundar/jsx typecheck
  -> exit 0

$ bun test ./packages/jsx
  55 pass, 0 fail, 1996 expect calls (14 component/rendering tests + prior)
  -> exit 0

$ bun tools/benchmark/jsx-list.ts
  jsx-list(10000): p50=4938695ns p95=7774957ns mean=5108752ns over 200 iterations
  artifact: evidence/gh-029/jsx-list-bench.json
  -> exit 0

$ bun test
  160 pass, 0 fail, 2307 expect calls across 24 files
  -> exit 0

$ bun run typecheck / lint / architecture:check (28 files) / pack:inspect @bundar/jsx / build / format:check
  -> exit 0
```

Tooling decisions (documented): planned `packages/jsx/test/components/**`
executes within `bun test ./packages/jsx`; planned `bench -- jsx-list` is
honored by the dedicated `tools/benchmark/jsx-list.ts` (the GH-007 harness
measures end-to-end adapters; the renderer needs isolation).

## Acceptance evidence

- Components ordinary functions: invoked with props, error attribution by
  name asserted; no lifecycle exists anywhere in the runtime.
- Order preservation: 5-level nested arrays render `1..5` in source order;
  Sets and generators render in iteration order.
- Keys: keyed/unkeyed output equality asserted; output contains no `key`.
- Cyclic/recursion: both cyclic shapes throw `CyclicChildError`;
  self-rendering component hits the 512 limit with guidance.
- Scale: 1000-deep nesting round-trips exact open/close tags; a 10,000-item
  list produces exactly 10,000 `<li>` elements in order; benchmark artifact
  records the cost (~4.9ms p50 for 10k items on this machine).
- No mandatory test failure hidden, skipped, or downgraded.

## Residual risks

- Async components/promised children are GH-030 (rejected here with a pointer,
  not silently awaited or stringified).
- String concatenation is the current render strategy; streaming and
  backpressure handling are GH-034.
