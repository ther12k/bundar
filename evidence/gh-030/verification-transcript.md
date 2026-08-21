# GH-030 Verification Transcript

## Environment

- Bun `1.4.0`
- TypeScript `6.0.3`
- Linux x86_64, Ubuntu kernel `7.0.0-28-generic`
- Implementation branch: `gh-030-async-components`

## Delivered contract

`packages/jsx/src/render/async.ts` exports `renderNodeAsync`,
`renderNodeAuto`, `AsyncComponentRenderError`, `AbortedRenderError`.

- **Detection without wrapping**: `renderNodeAuto` performs a structural
  probe; fully synchronous trees return a **plain string** through the
  synchronous `renderNode` path (verified `typeof === "string"`); any
  promise-valued child or async-function component switches to the async
  renderer.
- **Document order**: promised children and async components serialize in
  document order regardless of resolution timing (slow-first test proves a
  40ms sibling finishing after a 1ms sibling still renders first).
- **Rejection propagation**: async-component rejections wrap into
  `AsyncComponentRenderError` carrying the component name and cause;
  promised-child rejections propagate; sync throws inside async trees keep
  attribution.
- **Abort propagation**: `options.signal` checks before every node; aborts
  throw `AbortedRenderError` with the signal reason. Mid-render abort bounds
  work (later sibling components never invoke); pre-aborted signals reject
  without invoking any component.
- Concurrency policy: sibling async components are invoked in document order
  and their awaits interleave (natural concurrency), but serialization is
  strictly ordered.

## Exact verification commands

```text
$ bun install --frozen-lockfile
  -> exit 0

$ bun run --filter @bundar/jsx typecheck
  -> exit 0

$ bun test ./packages/jsx/test/async
  13 pass, 0 fail (within the 75-test jsx run)

$ bun tools/benchmark/jsx-async.ts
  sync renderNode (1000 items):     mean≈405600ns
  renderNodeAuto sync path:          mean≈467944ns (probe + render)
  async renderNodeAsync (1000 items): mean≈719864ns
  artifact: evidence/gh-030/jsx-async-bench.json
  -> exit 0

$ bun test
  224 pass, 0 fail, 2488 expect calls across 30 files
  -> exit 0

$ bun run typecheck / lint / architecture:check (34 files) / pack:inspect @bundar/jsx / build / format:check / docs:validate / docs:links
  -> exit 0
```

## Acceptance evidence

- Sync tree on sync path: `renderNodeAuto(syncTree)` returns a string; output
  equals `renderNode`.
- Deterministic async order: slow/fast sibling test asserts document order.
- Rejections carry component context (`Broken` → name + cause); ready to
  surface through the global error boundary when GH-020/GH-033 integrate it.
- Aborted renders bounded: 3-component tree aborted at 10ms invokes fewer
  than 3 components; pre-aborted signal invokes zero.
- No mandatory test failure hidden, skipped, or downgraded. One abort-path
  defect (raw `throwIfAborted` reason bypassing the wrapper) was found by the
  test and fixed.

## Residual risks

- Streaming flush policy (chunk emission as children resolve) is GH-034;
  this renderer awaits the complete tree before returning a string.
- `renderNodeAuto`'s probe is O(tree) — ~15% overhead on the sync path
  (recorded in the artifact); GH-033 may expose explicit sync/async entry
  points to bypass the probe.
