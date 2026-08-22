# Issue #97 verification transcript — parseForm bounded-body overhead

## Issue

[perf(core): parseForm bounded-body overhead ~2.5× raw text()](https://github.com/ther12k/bundar/issues/97)
(branch `gh-97-parseform-perf`, worktree `bundar-gh-97`, base commit
`7848c15` = main after the GH-088 release gate).

## Environment

Bun `1.4.0`; TypeScript `6.0.3`; Linux x86_64, 12 cores.

## Profile first (the issue's requirement)

Micro-profile of the components (10k ops): full `parseForm` ~48ns in
isolation; **timer+clearTimeout 0.16ns** (Bun timers are cheap — the
slowloris guard is NOT the cost); **reader loop 13.6ns** (the streamed
maxBytes enforcement — the security floor); decode+URLSearchParams
~1ns. Conclusion: the guards are already near the reader-loop floor;
the winnable costs were allocation churn, not security checks.

## Optimizations (contract intact — every GH-031 guard kept)

1. **Single-chunk copy elision**: small form posts arrive as one
   chunk; return it directly instead of copying into a combined buffer.
2. **Shared stateless TextDecoder**: one module-level decoder for
   whole-buffer decodes (no stream mode → no cross-request state).
3. **Limits-spread fast path**: `parseForm(context)` (the common call)
   reuses the frozen `DEFAULT_BODY_LIMITS` instead of spreading.
4. **One-pass urlencoded ParsedForm**: field order = first appearance,
   values in submission order — identical semantics to buildForm
   without the intermediate entries array and second scan (which also
   removed an O(n²) find for repeated fields).

## Measured result (the bench scenario, 3 independent runs)

| | raw-bun | hono | bundar | ratio |
| --- | ---: | ---: | ---: | ---: |
| before | 2.4–2.8µs | 5.1–6.8µs | 8.4–10.4µs | ~3.7× |
| after | 2.4–2.8µs | 5.8–6.7µs | 7.6–10.9µs (median ~8.8) | **~3.1× median** |

~1.5µs saved per form post (~15–20% of the scenario p50); the
remaining cost is the reader-loop security floor plus the scenario's
full progressive pipeline (validation + response composition) — the
price of the fail-closed contract, tracked rather than distorted.

## Verification

- `bun test packages/core` — 180/180 (all GH-031 limit/security tests
  locked and green).
- `bun run bench:release` + `bun run bench:regression` — within all 13
  M6 ratio/absolute budgets, 0 alerts.
- Full suite 827/827; typecheck; lint; format; pack:inspect @bundar/core.
- No API change: `parseForm`/`DEFAULT_BODY_LIMITS` signatures and
  semantics untouched.
